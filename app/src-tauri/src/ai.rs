use std::{env, time::Duration};

use async_trait::async_trait;
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

const NEBIUS_API_KEY: &str = "NEBIUS_API_KEY";
const NEBIUS_CHAT_COMPLETIONS_URL: &str =
    "https://api.tokenfactory.nebius.com/v1/chat/completions";

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AIRequest {
    pub model: String,
    pub system_prompt: Option<String>,
    pub user_prompt: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AIResponse {
    pub text: String,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u64>,
    pub latency_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct AIError {
    pub code: String,
    pub message: String,
}

impl AIError {
    fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_owned(),
            message: message.to_owned(),
        }
    }

    fn missing_api_key() -> Self {
        Self::new(
            "MISSING_API_KEY",
            "Nebius Token Factory is not configured. Set NEBIUS_API_KEY before launching ForgeMind.",
        )
    }
}

#[async_trait]
pub trait AIProvider {
    async fn generate(&self, request: AIRequest) -> Result<AIResponse, AIError>;
}

pub struct NebiusTokenFactoryProvider {
    client: Client,
    api_key: String,
}

impl NebiusTokenFactoryProvider {
    pub fn from_env() -> Result<Self, AIError> {
        Self::from_api_key(env::var(NEBIUS_API_KEY).ok())
    }

    fn from_api_key(api_key: Option<String>) -> Result<Self, AIError> {
        let api_key = api_key
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
            .ok_or_else(AIError::missing_api_key)?;
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|_| {
                AIError::new(
                    "NETWORK_ERROR",
                    "ForgeMind could not initialize the Nebius network client.",
                )
            })?;

        Ok(Self { client, api_key })
    }
}

#[async_trait]
impl AIProvider for NebiusTokenFactoryProvider {
    async fn generate(&self, request: AIRequest) -> Result<AIResponse, AIError> {
        validate_request(&request)?;
        let payload = ProviderRequest::from(&request);
        let started = std::time::Instant::now();
        let response = self
            .client
            .post(NEBIUS_CHAT_COMPLETIONS_URL)
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(|_| {
                AIError::new(
                    "NETWORK_ERROR",
                    "ForgeMind could not reach Nebius Token Factory.",
                )
            })?;

        if !response.status().is_success() {
            return Err(error_for_status(response.status()));
        }

        let raw = response.json::<ProviderResponse>().await.map_err(|_| {
            AIError::new(
                "MALFORMED_RESPONSE",
                "Nebius Token Factory returned a response ForgeMind could not read.",
            )
        })?;

        normalize_response(raw, started.elapsed())
    }
}

#[cfg(test)]
pub struct MockAIProvider;

#[cfg(test)]
#[async_trait]
impl AIProvider for MockAIProvider {
    async fn generate(&self, request: AIRequest) -> Result<AIResponse, AIError> {
        validate_request(&request)?;
        Ok(AIResponse {
            text: format!("Mock response for: {}", request.user_prompt),
            model: request.model,
            input_tokens: Some(4),
            output_tokens: Some(6),
            total_tokens: Some(10),
            latency_ms: 7,
        })
    }
}

pub async fn generate_with_nebius(request: AIRequest) -> Result<AIResponse, AIError> {
    NebiusTokenFactoryProvider::from_env()?
        .generate(request)
        .await
}

fn validate_request(request: &AIRequest) -> Result<(), AIError> {
    if request.model.trim().is_empty() {
        return Err(AIError::new(
            "INVALID_REQUEST",
            "Enter a Nebius model identifier.",
        ));
    }
    if request.user_prompt.trim().is_empty() {
        return Err(AIError::new("INVALID_REQUEST", "Enter an evaluation prompt."));
    }
    if request.max_tokens.is_some_and(|value| value == 0 || value > 4096) {
        return Err(AIError::new(
            "INVALID_REQUEST",
            "Maximum output tokens must be between 1 and 4096.",
        ));
    }
    if request
        .temperature
        .is_some_and(|value| !(0.0..=2.0).contains(&value))
    {
        return Err(AIError::new(
            "INVALID_REQUEST",
            "Temperature must be between 0 and 2.",
        ));
    }
    Ok(())
}

fn error_for_status(status: StatusCode) -> AIError {
    match status {
        StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY => AIError::new(
            "INVALID_REQUEST",
            "Nebius Token Factory rejected the evaluation request.",
        ),
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => AIError::new(
            "AUTHENTICATION_FAILED",
            "Nebius Token Factory rejected the configured API key.",
        ),
        StatusCode::TOO_MANY_REQUESTS => AIError::new(
            "RATE_LIMITED",
            "Nebius Token Factory rate-limited this request. Try again later.",
        ),
        _ => AIError::new(
            "PROVIDER_ERROR",
            "Nebius Token Factory could not complete the request.",
        ),
    }
}

#[derive(Debug, Serialize)]
struct ProviderRequest<'a> {
    model: &'a str,
    messages: Vec<ProviderMessage<'a>>,
    stream: bool,
    store: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
}

impl<'a> From<&'a AIRequest> for ProviderRequest<'a> {
    fn from(request: &'a AIRequest) -> Self {
        let mut messages = Vec::with_capacity(2);
        if let Some(system_prompt) = request
            .system_prompt
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            messages.push(ProviderMessage {
                role: "system",
                content: system_prompt,
            });
        }
        messages.push(ProviderMessage {
            role: "user",
            content: request.user_prompt.trim(),
        });

        Self {
            model: request.model.trim(),
            messages,
            stream: false,
            store: false,
            temperature: request.temperature,
            max_tokens: request.max_tokens,
        }
    }
}

#[derive(Debug, Serialize)]
struct ProviderMessage<'a> {
    role: &'static str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct ProviderResponse {
    model: String,
    choices: Vec<ProviderChoice>,
    usage: Option<ProviderUsage>,
}

#[derive(Debug, Deserialize)]
struct ProviderChoice {
    message: ProviderResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ProviderResponseMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProviderUsage {
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
    total_tokens: Option<u64>,
}

fn normalize_response(raw: ProviderResponse, latency: Duration) -> Result<AIResponse, AIError> {
    let text = raw
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            AIError::new(
                "MALFORMED_RESPONSE",
                "Nebius Token Factory returned no readable response text.",
            )
        })?;
    let model = raw.model.trim();
    if model.is_empty() {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned no model identifier.",
        ));
    }

    Ok(AIResponse {
        text: text.to_owned(),
        model: model.to_owned(),
        input_tokens: raw.usage.as_ref().and_then(|usage| usage.prompt_tokens),
        output_tokens: raw
            .usage
            .as_ref()
            .and_then(|usage| usage.completion_tokens),
        total_tokens: raw.usage.and_then(|usage| usage.total_tokens),
        latency_ms: latency.as_millis().try_into().unwrap_or(u64::MAX),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> AIRequest {
        AIRequest {
            model: "test/model".to_owned(),
            system_prompt: Some("Be concise.".to_owned()),
            user_prompt: "Say hello.".to_owned(),
            temperature: Some(0.2),
            max_tokens: Some(32),
        }
    }

    #[test]
    fn missing_key_is_a_controlled_error() {
        let error = NebiusTokenFactoryProvider::from_api_key(None).err().unwrap();
        assert_eq!(error.code, "MISSING_API_KEY");
        assert!(error.message.contains("NEBIUS_API_KEY"));
    }

    #[test]
    fn provider_request_is_normalized_without_credentials() {
        let payload = serde_json::to_value(ProviderRequest::from(&request())).unwrap();
        assert_eq!(payload["model"], "test/model");
        assert_eq!(payload["messages"][0]["role"], "system");
        assert_eq!(payload["messages"][1]["role"], "user");
        assert_eq!(payload["stream"], false);
        assert_eq!(payload["store"], false);
        assert!(payload.get("api_key").is_none());
    }

    #[test]
    fn response_usage_is_normalized() {
        let raw: ProviderResponse = serde_json::from_value(serde_json::json!({
            "model": "test/model",
            "choices": [{ "message": { "content": "Hello." } }],
            "usage": { "prompt_tokens": 4, "completion_tokens": 2, "total_tokens": 6 }
        }))
        .unwrap();
        let response = normalize_response(raw, Duration::from_millis(12)).unwrap();
        assert_eq!(response.text, "Hello.");
        assert_eq!(response.input_tokens, Some(4));
        assert_eq!(response.output_tokens, Some(2));
        assert_eq!(response.total_tokens, Some(6));
        assert_eq!(response.latency_ms, 12);
    }

    #[test]
    fn missing_usage_remains_missing() {
        let raw: ProviderResponse = serde_json::from_value(serde_json::json!({
            "model": "test/model",
            "choices": [{ "message": { "content": "Hello." } }]
        }))
        .unwrap();
        let response = normalize_response(raw, Duration::ZERO).unwrap();
        assert_eq!(response.input_tokens, None);
        assert_eq!(response.output_tokens, None);
        assert_eq!(response.total_tokens, None);
        let serialized = serde_json::to_value(response).unwrap();
        assert!(serialized.get("inputTokens").is_none());
        assert!(serialized.get("outputTokens").is_none());
        assert!(serialized.get("totalTokens").is_none());
    }

    #[test]
    fn malformed_response_fails_safely() {
        let raw: ProviderResponse = serde_json::from_value(serde_json::json!({
            "model": "test/model",
            "choices": []
        }))
        .unwrap();
        let error = normalize_response(raw, Duration::ZERO).unwrap_err();
        assert_eq!(error.code, "MALFORMED_RESPONSE");
    }

    #[test]
    fn credential_is_never_serialized_in_errors() {
        let secret = "secret-value-that-must-not-leak";
        let provider = NebiusTokenFactoryProvider::from_api_key(Some(secret.to_owned())).unwrap();
        let serialized = serde_json::to_string(&error_for_status(StatusCode::UNAUTHORIZED)).unwrap();
        assert!(!serialized.contains(secret));
        assert!(!format!("{:?}", provider.client).contains(secret));
    }

    #[tokio::test]
    async fn mock_provider_is_deterministic() {
        let response = MockAIProvider.generate(request()).await.unwrap();
        assert_eq!(response.text, "Mock response for: Say hello.");
        assert_eq!(response.model, "test/model");
        assert_eq!(response.input_tokens, Some(4));
        assert_eq!(response.output_tokens, Some(6));
        assert_eq!(response.total_tokens, Some(10));
        assert_eq!(response.latency_ms, 7);
    }
}
