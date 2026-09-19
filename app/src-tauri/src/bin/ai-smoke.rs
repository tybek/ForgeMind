use std::process::ExitCode;

use forgemind_lib::ai::{generate_with_nebius, AIRequest, ProviderDiagnostics};
use serde::Serialize;

const SMOKE_PROMPT: &str = "Reply with exactly: ForgeMind smoke test passed.";
const SMOKE_MAX_TOKENS: u32 = 256;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SmokeOutput {
    success: bool,
    model: Option<String>,
    text: Option<String>,
    latency_ms: Option<u64>,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
    finish_reason: Option<String>,
    provider_request_id: Option<String>,
    error_code: Option<String>,
    error_message: Option<String>,
    diagnostics: Option<ProviderDiagnostics>,
}

impl SmokeOutput {
    fn argument_error(message: String) -> Self {
        Self {
            success: false,
            model: None,
            text: None,
            latency_ms: None,
            input_tokens: None,
            output_tokens: None,
            total_tokens: None,
            finish_reason: None,
            provider_request_id: None,
            error_code: Some("INVALID_ARGUMENT".to_owned()),
            error_message: Some(message),
            diagnostics: None,
        }
    }
}

fn parse_model(arguments: impl IntoIterator<Item = String>) -> Result<String, String> {
    let arguments = arguments.into_iter().collect::<Vec<_>>();
    match arguments.as_slice() {
        [flag, model] if flag == "--model" && !model.trim().is_empty() => {
            Ok(model.trim().to_owned())
        }
        _ => Err("Usage: npm run ai:smoke -- --model <model-id>".to_owned()),
    }
}

fn print_json(output: &SmokeOutput) {
    println!(
        "{}",
        serde_json::to_string(output).expect("smoke output should serialize")
    );
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> ExitCode {
    let model = match parse_model(std::env::args().skip(1)) {
        Ok(model) => model,
        Err(message) => {
            print_json(&SmokeOutput::argument_error(message));
            return ExitCode::from(2);
        }
    };

    let request = AIRequest {
        model,
        system_prompt: None,
        user_prompt: SMOKE_PROMPT.to_owned(),
        temperature: Some(0.0),
        max_tokens: Some(SMOKE_MAX_TOKENS),
        reasoning_effort: Some("minimal".to_owned()),
    };

    match generate_with_nebius(request).await {
        Ok(response) => {
            print_json(&SmokeOutput {
                success: true,
                model: Some(response.model),
                text: Some(response.text),
                latency_ms: Some(response.latency_ms),
                input_tokens: response.input_tokens,
                output_tokens: response.output_tokens,
                total_tokens: response.total_tokens,
                finish_reason: response.finish_reason,
                provider_request_id: response.provider_request_id,
                error_code: None,
                error_message: None,
                diagnostics: None,
            });
            ExitCode::SUCCESS
        }
        Err(error) => {
            print_json(&SmokeOutput {
                success: false,
                model: None,
                text: None,
                latency_ms: None,
                input_tokens: None,
                output_tokens: None,
                total_tokens: None,
                finish_reason: None,
                provider_request_id: None,
                error_code: Some(error.code),
                error_message: Some(error.message),
                diagnostics: error.diagnostics,
            });
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_exactly_one_non_empty_model_argument() {
        assert_eq!(
            parse_model(["--model".to_owned(), " account/model ".to_owned()]).unwrap(),
            "account/model"
        );
    }

    #[test]
    fn rejects_missing_or_extra_arguments_without_calling_a_provider() {
        assert!(parse_model(Vec::<String>::new()).is_err());
        assert!(parse_model(["--model".to_owned(), "".to_owned()]).is_err());
        assert!(parse_model([
            "--model".to_owned(),
            "account/model".to_owned(),
            "extra".to_owned()
        ])
        .is_err());
    }
}
