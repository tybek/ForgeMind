use std::{env, time::Duration};

use async_trait::async_trait;
use reqwest::{header::HeaderMap, Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;

const NEBIUS_API_KEY: &str = "NEBIUS_API_KEY";
pub const MAX_COMPLETION_TOKENS: u32 = 8_192;
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
    pub reasoning_effort: Option<String>,
    #[serde(default, skip_deserializing, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<AIResponseFormat>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AIResponseFormat {
    JsonObject,
    JsonSchema { json_schema: Value },
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AIError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnostics: Option<ProviderDiagnostics>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderDiagnostics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_object: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,
    pub choices_present: bool,
    pub message_content_present: bool,
    pub reasoning_content_present: bool,
    pub refusal_present: bool,
    pub tool_calls_present: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_error_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rejected_parameter: Option<String>,
}

impl AIError {
    pub(crate) fn new(code: &str, message: &str) -> Self {
        Self {
            code: code.to_owned(),
            message: message.to_owned(),
            diagnostics: None,
        }
    }

    fn with_diagnostics(mut self, diagnostics: ProviderDiagnostics) -> Self {
        self.diagnostics = Some(diagnostics);
        self
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

        let status = response.status();
        let provider_request_id = provider_request_id(response.headers());
        let body = response.bytes().await.map_err(|_| {
            AIError::new(
                "MALFORMED_RESPONSE",
                "Nebius Token Factory returned a response ForgeMind could not read.",
            )
            .with_diagnostics(ProviderDiagnostics {
                http_status: Some(status.as_u16()),
                provider_request_id: provider_request_id.clone(),
                ..ProviderDiagnostics::default()
            })
        })?;

        if !status.is_success() {
            return Err(error_for_provider_response(
                status,
                &body,
                provider_request_id,
            ));
        }

        parse_success_response(&body, status, provider_request_id, started.elapsed())
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
            finish_reason: Some("stop".to_owned()),
            provider_request_id: None,
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
    if request.max_tokens.is_some_and(|value| value == 0 || value > MAX_COMPLETION_TOKENS) {
        return Err(AIError::new(
            "INVALID_REQUEST",
            "Maximum output tokens exceed ForgeMind's safe request bound.",
        ).with_diagnostics(ProviderDiagnostics {
            rejected_parameter: Some("max_completion_tokens".to_owned()),
            ..ProviderDiagnostics::default()
        }));
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
    if request.reasoning_effort.as_deref().is_some_and(|value| {
        !matches!(
            value,
            "none" | "minimal" | "low" | "medium" | "high" | "xhigh"
        )
    }) {
        return Err(AIError::new(
            "INVALID_REQUEST",
            "Reasoning effort must be none, minimal, low, medium, high, or xhigh.",
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

fn error_for_provider_response(
    status: StatusCode,
    body: &[u8],
    provider_request_id: Option<String>,
) -> AIError {
    let mut diagnostics = ProviderDiagnostics {
        http_status: Some(status.as_u16()),
        provider_request_id,
        ..ProviderDiagnostics::default()
    };

    if let Ok(envelope) = serde_json::from_slice::<ProviderErrorEnvelope>(body) {
        diagnostics.provider_error_code = envelope.error.code.and_then(safe_provider_value);
        diagnostics.provider_error_type = envelope.error.kind.and_then(safe_provider_value);
        diagnostics.rejected_parameter = envelope.error.param.and_then(safe_provider_value);
    }

    error_for_status(status).with_diagnostics(diagnostics)
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
    #[serde(rename = "max_completion_tokens")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reasoning_effort: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    response_format: Option<&'a AIResponseFormat>,
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
            reasoning_effort: request.reasoning_effort.as_deref(),
            response_format: request.response_format.as_ref(),
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
    object: Option<String>,
    model: Option<String>,
    choices: Option<Vec<ProviderChoice>>,
    usage: Option<ProviderUsage>,
}

#[derive(Debug, Deserialize)]
struct ProviderChoice {
    message: Option<ProviderResponseMessage>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProviderResponseMessage {
    content: Option<String>,
    refusal: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProviderUsage {
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
    total_tokens: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct ProviderErrorEnvelope {
    error: ProviderErrorPayload,
}

#[derive(Debug, Deserialize)]
struct ProviderErrorPayload {
    code: Option<Value>,
    #[serde(rename = "type")]
    kind: Option<Value>,
    param: Option<Value>,
}

fn parse_success_response(
    body: &[u8],
    status: StatusCode,
    provider_request_id: Option<String>,
    latency: Duration,
) -> Result<AIResponse, AIError> {
    let value = serde_json::from_slice::<Value>(body).map_err(|_| {
        AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned a response ForgeMind could not read.",
        )
        .with_diagnostics(ProviderDiagnostics {
            http_status: Some(status.as_u16()),
            provider_request_id: provider_request_id.clone(),
            ..ProviderDiagnostics::default()
        })
    })?;
    let diagnostics = response_diagnostics(&value, status, provider_request_id.clone());
    let raw = serde_json::from_value::<ProviderResponse>(value).map_err(|_| {
        AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned a response shape ForgeMind does not support.",
        )
        .with_diagnostics(diagnostics.clone())
    })?;

    normalize_response(raw, diagnostics, provider_request_id, latency)
}

fn normalize_response(
    raw: ProviderResponse,
    diagnostics: ProviderDiagnostics,
    provider_request_id: Option<String>,
    latency: Duration,
) -> Result<AIResponse, AIError> {
    if raw.object.as_deref() != Some("chat.completion") {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned an unexpected response object type.",
        )
        .with_diagnostics(diagnostics));
    }
    let choices = raw.choices.as_ref().filter(|choices| !choices.is_empty());
    if choices.is_none() {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned no completion choices.",
        )
        .with_diagnostics(diagnostics));
    }
    let choice = choices.and_then(|choices| choices.first());
    if choice.and_then(|choice| choice.message.as_ref()).is_none() {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned a completion choice without a message.",
        )
        .with_diagnostics(diagnostics));
    }
    if choice
        .and_then(|choice| choice.finish_reason.as_deref())
        .map(str::trim)
        .filter(|reason| !reason.is_empty())
        .is_none()
    {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned a completion choice without a finish reason.",
        )
        .with_diagnostics(diagnostics));
    }
    let message = choice.and_then(|choice| choice.message.as_ref());
    let text = message
        .and_then(|message| readable_text(message.content.as_deref()))
        .or_else(|| message.and_then(|message| readable_text(message.refusal.as_deref())))
        .ok_or_else(|| no_readable_text_error(diagnostics.clone()))?;
    let model = raw.model.as_deref().unwrap_or_default().trim();
    if model.is_empty() {
        return Err(AIError::new(
            "MALFORMED_RESPONSE",
            "Nebius Token Factory returned no model identifier.",
        )
        .with_diagnostics(diagnostics));
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
        finish_reason: choice
            .and_then(|choice| choice.finish_reason.as_deref())
            .and_then(safe_metadata),
        provider_request_id,
    })
}

fn readable_text(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn no_readable_text_error(diagnostics: ProviderDiagnostics) -> AIError {
    let (code, message) = if diagnostics.finish_reason.as_deref() == Some("length") {
        (
            "OUTPUT_TRUNCATED",
            "Nebius Token Factory reached the output-token limit before returning readable response text.",
        )
    } else if diagnostics.tool_calls_present {
        (
            "UNSUPPORTED_RESPONSE",
            "Nebius Token Factory returned a tool call instead of readable response text.",
        )
    } else {
        (
            "NO_READABLE_TEXT",
            "Nebius Token Factory returned no readable response text.",
        )
    };

    AIError::new(code, message).with_diagnostics(diagnostics)
}

fn response_diagnostics(
    value: &Value,
    status: StatusCode,
    provider_request_id: Option<String>,
) -> ProviderDiagnostics {
    let choices = value.get("choices").and_then(Value::as_array);
    let choice = choices.and_then(|choices| choices.first());
    let message = choice.and_then(|choice| choice.get("message"));

    ProviderDiagnostics {
        http_status: Some(status.as_u16()),
        response_object: value
            .get("object")
            .and_then(Value::as_str)
            .and_then(safe_metadata),
        finish_reason: choice
            .and_then(|choice| choice.get("finish_reason"))
            .and_then(Value::as_str)
            .and_then(safe_metadata),
        choices_present: choices.is_some_and(|choices| !choices.is_empty()),
        message_content_present: message
            .and_then(|message| message.get("content"))
            .is_some_and(|content| !content.is_null()),
        reasoning_content_present: message
            .and_then(|message| message.get("reasoning_content"))
            .is_some_and(|content| !content.is_null()),
        refusal_present: message
            .and_then(|message| message.get("refusal"))
            .is_some_and(|content| !content.is_null()),
        tool_calls_present: message
            .and_then(|message| message.get("tool_calls"))
            .and_then(Value::as_array)
            .is_some_and(|calls| !calls.is_empty()),
        reasoning_tokens: value
            .get("usage")
            .and_then(|usage| usage.get("completion_tokens_details"))
            .and_then(|details| details.get("reasoning_tokens"))
            .and_then(Value::as_u64),
        provider_request_id,
        provider_error_code: None,
        provider_error_type: None,
        rejected_parameter: None,
    }
}

fn provider_request_id(headers: &HeaderMap) -> Option<String> {
    headers
        .get("request-id")
        .or_else(|| headers.get("x-request-id"))
        .and_then(|value| value.to_str().ok())
        .and_then(safe_metadata)
}

fn safe_provider_value(value: Value) -> Option<String> {
    match value {
        Value::String(value) => safe_metadata(&value),
        Value::Number(value) => safe_metadata(&value.to_string()),
        _ => None,
    }
}

fn safe_metadata(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > 200
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "-_.:/".contains(character))
    {
        return None;
    }
    Some(value.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_fixture(value: Value) -> Result<AIResponse, AIError> {
        let body = serde_json::to_vec(&value).unwrap();
        parse_success_response(
            &body,
            StatusCode::OK,
            Some("request-safe-123".to_owned()),
            Duration::from_millis(12),
        )
    }

    fn request() -> AIRequest {
        AIRequest {
            model: "test/model".to_owned(),
            system_prompt: Some("Be concise.".to_owned()),
            user_prompt: "Say hello.".to_owned(),
            temperature: Some(0.2),
            max_tokens: Some(32),
            reasoning_effort: Some("minimal".to_owned()),
            response_format: None,
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
        assert_eq!(payload["max_completion_tokens"], 32);
        assert_eq!(payload["reasoning_effort"], "minimal");
        assert!(payload.get("max_tokens").is_none());
        assert!(payload.get("api_key").is_none());
        assert!(payload.get("response_format").is_none());
    }

    #[test]
    fn provider_request_serializes_supported_response_formats_only_when_requested() {
        let mut input = request();
        input.response_format = Some(AIResponseFormat::JsonObject);
        let object_payload = serde_json::to_value(ProviderRequest::from(&input)).unwrap();
        assert_eq!(object_payload["response_format"], serde_json::json!({ "type": "json_object" }));

        input.response_format = Some(AIResponseFormat::JsonSchema {
            json_schema: serde_json::json!({
                "type": "object",
                "properties": { "message": { "type": "string" } },
                "required": ["message"],
                "additionalProperties": false
            }),
        });
        let schema_payload = serde_json::to_value(ProviderRequest::from(&input)).unwrap();
        assert_eq!(schema_payload["response_format"]["type"], "json_schema");
        assert_eq!(schema_payload["response_format"]["json_schema"]["required"], serde_json::json!(["message"]));
    }

    #[test]
    fn documented_text_response_is_normalized_with_diagnostics_metadata() {
        let response = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": { "content": "Hello.", "role": "assistant" },
                "finish_reason": "stop"
            }],
            "usage": { "prompt_tokens": 4, "completion_tokens": 2, "total_tokens": 6 }
        }))
        .unwrap();
        assert_eq!(response.text, "Hello.");
        assert_eq!(response.input_tokens, Some(4));
        assert_eq!(response.output_tokens, Some(2));
        assert_eq!(response.total_tokens, Some(6));
        assert_eq!(response.latency_ms, 12);
        assert_eq!(response.finish_reason.as_deref(), Some("stop"));
        assert_eq!(response.provider_request_id.as_deref(), Some("request-safe-123"));
    }

    #[test]
    fn missing_usage_remains_missing() {
        let response = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": { "content": "Hello." },
                "finish_reason": "stop"
            }]
        }))
        .unwrap();
        assert_eq!(response.input_tokens, None);
        assert_eq!(response.output_tokens, None);
        assert_eq!(response.total_tokens, None);
        let serialized = serde_json::to_value(response).unwrap();
        assert!(serialized.get("inputTokens").is_none());
        assert!(serialized.get("outputTokens").is_none());
        assert!(serialized.get("totalTokens").is_none());
    }

    #[test]
    fn documented_refusal_is_readable_when_content_is_null() {
        let response = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": { "content": null, "refusal": "I cannot help with that." },
                "finish_reason": "stop"
            }]
        }))
        .unwrap();

        assert_eq!(response.text, "I cannot help with that.");
    }

    #[test]
    fn reasoning_content_is_detected_but_never_exposed_as_answer_text() {
        let error = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "deepseek-ai/DeepSeek-V4.1-Flash",
            "choices": [{
                "message": { "content": null, "reasoning_content": "private reasoning" },
                "finish_reason": "length"
            }],
            "usage": {
                "prompt_tokens": 11,
                "completion_tokens": 32,
                "total_tokens": 43,
                "completion_tokens_details": { "reasoning_tokens": 32 }
            }
        }))
        .unwrap_err();

        assert_eq!(error.code, "OUTPUT_TRUNCATED");
        assert!(!error.message.contains("private reasoning"));
        let diagnostics = error.diagnostics.unwrap();
        assert_eq!(diagnostics.http_status, Some(200));
        assert_eq!(diagnostics.response_object.as_deref(), Some("chat.completion"));
        assert_eq!(diagnostics.finish_reason.as_deref(), Some("length"));
        assert!(diagnostics.choices_present);
        assert!(!diagnostics.message_content_present);
        assert!(diagnostics.reasoning_content_present);
        assert_eq!(diagnostics.reasoning_tokens, Some(32));
        assert_eq!(diagnostics.provider_request_id.as_deref(), Some("request-safe-123"));
    }

    #[test]
    fn visible_text_wins_over_reasoning_content() {
        let response = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": {
                    "content": "Final answer.",
                    "reasoning_content": "private reasoning"
                },
                "finish_reason": "stop"
            }]
        }))
        .unwrap();

        assert_eq!(response.text, "Final answer.");
    }

    #[test]
    fn null_content_without_readable_alternative_reports_safe_metadata() {
        let error = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": { "content": null },
                "finish_reason": "stop"
            }]
        }))
        .unwrap_err();

        assert_eq!(error.code, "NO_READABLE_TEXT");
        let diagnostics = error.diagnostics.unwrap();
        assert!(diagnostics.choices_present);
        assert!(!diagnostics.message_content_present);
        assert!(!diagnostics.reasoning_content_present);
    }

    #[test]
    fn array_content_is_rejected_instead_of_silently_coerced() {
        let error = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": {
                    "content": [{ "type": "text", "text": "Unexpected shape" }]
                },
                "finish_reason": "stop"
            }]
        }))
        .unwrap_err();

        assert_eq!(error.code, "MALFORMED_RESPONSE");
        assert!(error.diagnostics.unwrap().message_content_present);
    }

    #[test]
    fn missing_choices_fail_with_structured_diagnostics() {
        let error = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": []
        }))
        .unwrap_err();

        assert_eq!(error.code, "MALFORMED_RESPONSE");
        assert!(!error.diagnostics.unwrap().choices_present);
    }

    #[test]
    fn tool_call_without_text_is_reported_as_unsupported() {
        let error = parse_fixture(serde_json::json!({
            "object": "chat.completion",
            "model": "test/model",
            "choices": [{
                "message": {
                    "content": null,
                    "tool_calls": [{ "id": "call-1", "type": "function" }]
                },
                "finish_reason": "tool_calls"
            }]
        }))
        .unwrap_err();

        assert_eq!(error.code, "UNSUPPORTED_RESPONSE");
        assert!(error.diagnostics.unwrap().tool_calls_present);
    }

    #[test]
    fn provider_error_envelope_preserves_only_safe_metadata() {
        let body = serde_json::to_vec(&serde_json::json!({
            "error": {
                "code": "model_not_found",
                "type": "invalid_request_error",
                "param": "max_completion_tokens",
                "message": "arbitrary provider detail must not be reflected"
            }
        }))
        .unwrap();
        let error = error_for_provider_response(
            StatusCode::BAD_REQUEST,
            &body,
            Some("request-safe-456".to_owned()),
        );
        let serialized = serde_json::to_string(&error).unwrap();

        assert_eq!(error.code, "INVALID_REQUEST");
        let diagnostics = error.diagnostics.unwrap();
        assert_eq!(diagnostics.http_status, Some(400));
        assert_eq!(diagnostics.provider_error_code.as_deref(), Some("model_not_found"));
        assert_eq!(
            diagnostics.provider_error_type.as_deref(),
            Some("invalid_request_error")
        );
        assert_eq!(diagnostics.provider_request_id.as_deref(), Some("request-safe-456"));
        assert_eq!(diagnostics.rejected_parameter.as_deref(), Some("max_completion_tokens"));
        assert!(!serialized.contains("arbitrary provider detail"));
    }

    #[test]
    fn global_completion_budget_bound_is_enforced_without_prompt_exposure() {
        let mut input = request();
        input.max_tokens = Some(MAX_COMPLETION_TOKENS + 1);
        input.user_prompt = "private-project-prompt-marker".to_owned();

        let error = validate_request(&input).unwrap_err();
        let serialized = serde_json::to_string(&error).unwrap();

        assert_eq!(error.code, "INVALID_REQUEST");
        assert_eq!(
            error.diagnostics.unwrap().rejected_parameter.as_deref(),
            Some("max_completion_tokens")
        );
        assert!(!serialized.contains("private-project-prompt-marker"));
    }

    #[test]
    fn request_id_is_accepted_only_from_safe_response_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-request-id",
            reqwest::header::HeaderValue::from_static("request-safe-789"),
        );
        assert_eq!(provider_request_id(&headers).as_deref(), Some("request-safe-789"));

        headers.insert(
            "request-id",
            reqwest::header::HeaderValue::from_static("unsafe value"),
        );
        assert_eq!(provider_request_id(&headers), None);
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
        assert_eq!(response.finish_reason.as_deref(), Some("stop"));
    }
}
