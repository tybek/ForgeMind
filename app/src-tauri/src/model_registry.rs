use serde::Serialize;
use std::collections::HashSet;

pub const NEBIUS_PROVIDER_ID: &str = "nebius_token_factory";

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPricing {
    pub input_usd_per_million_tokens: f64,
    pub output_usd_per_million_tokens: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supports_reasoning_effort: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supports_structured_output: Option<bool>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    pub provider: String,
    pub model_id: String,
    pub display_name: String,
    pub family: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    pub availability: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pricing: Option<ModelPricing>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub capabilities: ModelCapabilities,
    pub enabled: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRegistryError {
    pub code: &'static str,
    pub message: String,
}

fn configured_entries() -> Vec<ModelEntry> {
    vec![ModelEntry {
        provider: NEBIUS_PROVIDER_ID.to_owned(),
        model_id: "deepseek-ai/DeepSeek-V4.1-Flash".to_owned(),
        display_name: "DeepSeek V4.1 Flash".to_owned(),
        family: "DeepSeek V4.1".to_owned(),
        vendor: Some("DeepSeek".to_owned()),
        category: Some("reasoning".to_owned()),
        availability: "configured".to_owned(),
        pricing: None,
        notes: Some("Availability depends on the configured Nebius Token Factory account.".to_owned()),
        capabilities: ModelCapabilities {
            max_completion_tokens: None,
            supports_reasoning_effort: Some(true),
            supports_structured_output: None,
        },
        enabled: true,
    }]
}

fn validate_entries(entries: Vec<ModelEntry>) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let mut identifiers = HashSet::new();
    for entry in &entries {
        if entry.model_id.trim().is_empty()
            || !identifiers.insert(entry.model_id.clone())
            || entry.capabilities.max_completion_tokens == Some(0)
        {
            return Err(ModelRegistryError {
                code: "INVALID_MODEL_REGISTRY",
                message: "The ForgeMind model registry contains an empty or duplicate model identifier."
                    .to_owned(),
            });
        }
    }
    Ok(entries)
}

pub fn models() -> Result<Vec<ModelEntry>, ModelRegistryError> {
    validate_entries(configured_entries())
}

pub fn enabled_model(model_id: &str) -> Result<ModelEntry, ModelRegistryError> {
    models()?
        .into_iter()
        .find(|entry| entry.enabled && entry.model_id == model_id.trim())
        .ok_or_else(|| ModelRegistryError {
            code: "UNKNOWN_MODEL",
            message: "The selected model is not enabled in the ForgeMind model registry.".to_owned(),
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(model_id: &str) -> ModelEntry {
        ModelEntry {
            provider: NEBIUS_PROVIDER_ID.to_owned(),
            model_id: model_id.to_owned(),
            display_name: model_id.to_owned(),
            family: "test".to_owned(),
            vendor: None,
            category: None,
            availability: "configured".to_owned(),
            pricing: None,
            notes: None,
            capabilities: ModelCapabilities::default(),
            enabled: true,
        }
    }

    #[test]
    fn configured_registry_loads_enabled_models() {
        let models = models().unwrap();
        assert!(!models.is_empty());
        assert!(models.iter().all(|model| model.enabled));
    }

    #[test]
    fn duplicate_model_ids_are_rejected() {
        let error = validate_entries(vec![entry("same/model"), entry("same/model")]).unwrap_err();
        assert_eq!(error.code, "INVALID_MODEL_REGISTRY");
    }

    #[test]
    fn model_lookup_returns_the_configured_entry() {
        let model = enabled_model("deepseek-ai/DeepSeek-V4.1-Flash").unwrap();
        assert_eq!(model.display_name, "DeepSeek V4.1 Flash");
        assert_eq!(model.capabilities.max_completion_tokens, None);
        assert_eq!(model.capabilities.supports_reasoning_effort, Some(true));
        assert_eq!(model.capabilities.supports_structured_output, None);
    }

    #[test]
    fn invalid_zero_model_limit_is_rejected() {
        let mut invalid = entry("test/model");
        invalid.capabilities.max_completion_tokens = Some(0);
        assert_eq!(validate_entries(vec![invalid]).unwrap_err().code, "INVALID_MODEL_REGISTRY");
    }

    #[test]
    fn unknown_model_id_fails_safely() {
        let error = enabled_model("unknown/model").unwrap_err();
        assert_eq!(error.code, "UNKNOWN_MODEL");
        assert!(!error.message.contains("unknown/model"));
    }
}
