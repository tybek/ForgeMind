use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const NEBIUS_PROVIDER_ID: &str = "nebius_token_factory";
pub const CREATOR_DEFAULT_MODEL_ID: &str = "nvidia/nemotron-3-super-120b-a12b";
pub const REGISTRY_FILE_NAME: &str = "model-registry-v1.json";
static REGISTRY_FILE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPricing {
    pub input_usd_per_million_tokens: f64,
    pub output_usd_per_million_tokens: f64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StructuredOutputCapability {
    #[default]
    None,
    JsonObject,
    JsonSchema,
}

impl StructuredOutputCapability {
    pub fn satisfies(self, required: Self) -> bool {
        matches!(
            (self, required),
            (_, Self::None)
                | (Self::JsonObject, Self::JsonObject)
                | (Self::JsonSchema, Self::JsonObject | Self::JsonSchema)
        )
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supports_reasoning_effort: Option<bool>,
    pub structured_output: StructuredOutputCapability,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
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

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RegistryDocument {
    format_version: u32,
    models: Vec<ModelEntry>,
}

impl ModelRegistryError {
    fn storage() -> Self {
        Self {
            code: "MODEL_REGISTRY_STORAGE_FAILED",
            message: "ForgeMind could not access its application-local model registry.".to_owned(),
        }
    }
}

fn configured_entries() -> Vec<ModelEntry> {
    vec![
        ModelEntry {
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
                structured_output: StructuredOutputCapability::None,
            },
            enabled: true,
        },
        ModelEntry {
            provider: NEBIUS_PROVIDER_ID.to_owned(),
            model_id: CREATOR_DEFAULT_MODEL_ID.to_owned(),
            display_name: "NVIDIA Nemotron 3 Super 120B".to_owned(),
            family: "Nemotron 3 Super".to_owned(),
            vendor: Some("NVIDIA".to_owned()),
            category: None,
            availability: "configured".to_owned(),
            pricing: None,
            notes: Some("Availability depends on the configured Nebius Token Factory account.".to_owned()),
            capabilities: ModelCapabilities {
                structured_output: StructuredOutputCapability::JsonObject,
                ..ModelCapabilities::default()
            },
            enabled: true,
        },
    ]
}

fn validate_entries(entries: Vec<ModelEntry>) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let mut identifiers = HashSet::new();
    for entry in &entries {
        if !valid_model_id(&entry.model_id)
            || !identifiers.insert(entry.model_id.clone())
            || entry.display_name.trim().is_empty()
            || entry.display_name.chars().count() > 120
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

pub fn valid_model_id(value: &str) -> bool {
    let value = value.trim();
    !value.is_empty()
        && value.chars().count() <= 200
        && value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.' | '/' | ':'))
        && !value.contains("://")
}

pub fn application_registry_path() -> Result<PathBuf, ModelRegistryError> {
    #[cfg(target_os = "windows")]
    let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    #[cfg(target_os = "macos")]
    let base = std::env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Library").join("Application Support"));
    #[cfg(all(unix, not(target_os = "macos")))]
    let base = std::env::var_os("XDG_DATA_HOME").map(PathBuf::from).or_else(|| {
        std::env::var_os("HOME").map(PathBuf::from).map(|home| home.join(".local").join("share"))
    });
    base.map(|directory| directory.join("ForgeMind").join(REGISTRY_FILE_NAME))
        .ok_or_else(ModelRegistryError::storage)
}

fn load_from(path: &Path) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let _guard = REGISTRY_FILE_LOCK.lock().map_err(|_| ModelRegistryError::storage())?;
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return validate_entries(configured_entries()),
        Err(_) => return Err(ModelRegistryError::storage()),
    };
    let document: RegistryDocument = serde_json::from_str(&contents).map_err(|_| ModelRegistryError::storage())?;
    if document.format_version != 1 {
        return Err(ModelRegistryError::storage());
    }
    validate_entries(document.models)
}

fn save_to(path: &Path, entries: Vec<ModelEntry>) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let entries = validate_entries(entries)?;
    let document = RegistryDocument { format_version: 1, models: entries.clone() };
    let bytes = serde_json::to_vec_pretty(&document).map_err(|_| ModelRegistryError::storage())?;
    let _guard = REGISTRY_FILE_LOCK.lock().map_err(|_| ModelRegistryError::storage())?;
    let parent = path.parent().ok_or_else(ModelRegistryError::storage)?;
    fs::create_dir_all(parent).map_err(|_| ModelRegistryError::storage())?;
    fs::write(path, bytes).map_err(|_| ModelRegistryError::storage())?;
    Ok(entries)
}

pub fn models() -> Result<Vec<ModelEntry>, ModelRegistryError> {
    #[cfg(test)]
    return validate_entries(configured_entries());
    #[cfg(not(test))]
    load_from(&application_registry_path()?)
}

pub fn enabled_models() -> Result<Vec<ModelEntry>, ModelRegistryError> {
    Ok(models()?.into_iter().filter(|model| model.enabled).collect())
}

pub fn set_enabled(model_id: &str, enabled: bool) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    set_enabled_at(&application_registry_path()?, model_id, enabled)
}

fn set_enabled_at(path: &Path, model_id: &str, enabled: bool) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let mut entries = load_from(path)?;
    let model = entries.iter_mut().find(|entry| entry.model_id == model_id.trim()).ok_or_else(|| ModelRegistryError {
        code: "UNKNOWN_MODEL",
        message: "The selected model is not present in the ForgeMind model registry.".to_owned(),
    })?;
    if !enabled && model.model_id == CREATOR_DEFAULT_MODEL_ID {
        return Err(ModelRegistryError {
            code: "DEFAULT_MODEL_REQUIRED",
            message: "Choose a replacement default before disabling ForgeMind's current default model.".to_owned(),
        });
    }
    model.enabled = enabled;
    save_to(path, entries)
}

pub fn add_model(model_id: &str, display_name: Option<&str>, availability: &str) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    add_model_at(&application_registry_path()?, model_id, display_name, availability)
}

fn add_model_at(path: &Path, model_id: &str, display_name: Option<&str>, availability: &str) -> Result<Vec<ModelEntry>, ModelRegistryError> {
    let model_id = model_id.trim();
    if !valid_model_id(model_id) {
        return Err(ModelRegistryError { code: "INVALID_MODEL_ID", message: "Enter a model ID using only letters, numbers, slash, colon, dot, dash, or underscore.".to_owned() });
    }
    let mut entries = load_from(path)?;
    if let Some(existing) = entries.iter_mut().find(|entry| entry.model_id == model_id) {
        existing.enabled = true;
        return save_to(path, entries);
    }
    let name = display_name.map(str::trim).filter(|value| !value.is_empty()).unwrap_or(model_id);
    if name.chars().count() > 120 {
        return Err(ModelRegistryError { code: "INVALID_DISPLAY_NAME", message: "The friendly model name must contain at most 120 characters.".to_owned() });
    }
    entries.push(ModelEntry {
        provider: NEBIUS_PROVIDER_ID.to_owned(), model_id: model_id.to_owned(), display_name: name.to_owned(),
        family: "Unverified model".to_owned(), vendor: None, category: None, availability: availability.to_owned(),
        pricing: None, notes: Some("Capability metadata is not verified. Structured output defaults to NONE.".to_owned()),
        capabilities: ModelCapabilities::default(), enabled: true,
    });
    save_to(path, entries)
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

pub fn require_structured_output(
    model: &ModelEntry,
    required: StructuredOutputCapability,
) -> Result<(), ModelRegistryError> {
    if model.capabilities.structured_output.satisfies(required) {
        Ok(())
    } else {
        Err(ModelRegistryError {
            code: "MODEL_CAPABILITY_REQUIRED",
            message: "This workflow requires verified structured output, but the selected model is not verified for it.".to_owned(),
        })
    }
}

pub fn creator_default_model() -> Result<ModelEntry, ModelRegistryError> {
    enabled_model(CREATOR_DEFAULT_MODEL_ID)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

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
        assert_eq!(models.len(), 2);
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
        assert_eq!(model.capabilities.structured_output, StructuredOutputCapability::None);
    }

    #[test]
    fn nemotron_is_enabled_with_documented_json_object_capability() {
        let model = creator_default_model().unwrap();
        assert_eq!(model.model_id, CREATOR_DEFAULT_MODEL_ID);
        assert_eq!(model.display_name, "NVIDIA Nemotron 3 Super 120B");
        assert_eq!(model.provider, NEBIUS_PROVIDER_ID);
        assert_eq!(model.pricing, None);
        assert_eq!(model.capabilities.structured_output, StructuredOutputCapability::JsonObject);
    }

    #[test]
    fn json_object_requirement_rejects_none_and_accepts_object_or_schema() {
        let mut model = entry("test/model");
        assert_eq!(
            require_structured_output(&model, StructuredOutputCapability::JsonObject).unwrap_err().code,
            "MODEL_CAPABILITY_REQUIRED"
        );
        model.capabilities.structured_output = StructuredOutputCapability::JsonObject;
        assert!(require_structured_output(&model, StructuredOutputCapability::JsonObject).is_ok());
        model.capabilities.structured_output = StructuredOutputCapability::JsonSchema;
        assert!(require_structured_output(&model, StructuredOutputCapability::JsonObject).is_ok());
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

    #[test]
    fn application_local_registry_enables_custom_models_conservatively() {
        let temp = TempDir::new().unwrap();
        let path = temp.path().join(REGISTRY_FILE_NAME);
        let models = add_model_at(&path, "vendor/new-model", Some("New Model"), "unverified").unwrap();
        let model = models.iter().find(|model| model.model_id == "vendor/new-model").unwrap();
        assert!(model.enabled);
        assert_eq!(model.capabilities.structured_output, StructuredOutputCapability::None);
        assert_eq!(model.pricing, None);
        assert_eq!(load_from(&path).unwrap(), models);
    }

    #[test]
    fn default_cannot_be_disabled_but_alternate_can() {
        let temp = TempDir::new().unwrap();
        let path = temp.path().join(REGISTRY_FILE_NAME);
        assert_eq!(set_enabled_at(&path, CREATOR_DEFAULT_MODEL_ID, false).unwrap_err().code, "DEFAULT_MODEL_REQUIRED");
        let models = set_enabled_at(&path, "deepseek-ai/DeepSeek-V4.1-Flash", false).unwrap();
        assert!(!models.iter().find(|model| model.model_id == "deepseek-ai/DeepSeek-V4.1-Flash").unwrap().enabled);
    }

    #[test]
    fn custom_model_ids_reject_urls_and_unsafe_characters() {
        assert!(!valid_model_id("https://example.com/model"));
        assert!(!valid_model_id("model id"));
        assert!(valid_model_id("vendor/model-1.0:fast"));
    }
}
