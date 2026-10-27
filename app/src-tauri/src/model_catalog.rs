use crate::model_registry::{self, ModelEntry, ModelRegistryError};
use chrono::{SecondsFormat, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

const NEBIUS_API_KEY: &str = "NEBIUS_API_KEY";
const NEBIUS_MODELS_URL: &str = "https://api.tokenfactory.nebius.com/v1/models";
pub const CATALOG_FILE_NAME: &str = "model-catalog-v1.json";

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableModel {
    pub provider_model_id: String,
    pub display_name: String,
    pub provider: String,
    pub discovered_at: String,
    pub availability: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ModelCatalog {
    pub format_version: u32,
    pub refreshed_at: String,
    pub models: Vec<AvailableModel>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCatalogError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelManagementState {
    pub provider_configured: bool,
    pub catalog: Option<ModelCatalog>,
    pub registry: Vec<ModelEntry>,
}

#[derive(Deserialize)]
struct ProviderCatalog {
    object: String,
    data: Vec<ProviderModel>,
}

#[derive(Deserialize)]
struct ProviderModel {
    id: String,
}

impl ModelCatalogError {
    fn new(code: &'static str, message: &str) -> Self {
        Self { code, message: message.to_owned() }
    }

    fn storage() -> Self {
        Self::new("MODEL_CATALOG_STORAGE_FAILED", "ForgeMind could not access its application-local model catalog cache.")
    }
}

impl From<ModelRegistryError> for ModelCatalogError {
    fn from(error: ModelRegistryError) -> Self {
        Self { code: error.code, message: error.message }
    }
}

pub fn application_catalog_path() -> Result<PathBuf, ModelCatalogError> {
    let registry_path = model_registry::application_registry_path()?;
    Ok(registry_path.with_file_name(CATALOG_FILE_NAME))
}

pub fn provider_configured() -> bool {
    std::env::var(NEBIUS_API_KEY).ok().is_some_and(|value| !value.trim().is_empty())
}

pub fn state() -> Result<ModelManagementState, ModelCatalogError> {
    Ok(ModelManagementState {
        provider_configured: provider_configured(),
        catalog: load_catalog(&application_catalog_path()?)?,
        registry: model_registry::models()?,
    })
}

pub async fn refresh() -> Result<ModelManagementState, ModelCatalogError> {
    let api_key = std::env::var(NEBIUS_API_KEY).ok().filter(|value| !value.trim().is_empty()).ok_or_else(|| {
        ModelCatalogError::new("MISSING_API_KEY", "Nebius Token Factory is not configured. Set NEBIUS_API_KEY before launching ForgeMind.")
    })?;
    let catalog = fetch_catalog(NEBIUS_MODELS_URL, &api_key).await?;
    save_catalog(&application_catalog_path()?, &catalog)?;
    state()
}

async fn fetch_catalog(url: &str, api_key: &str) -> Result<ModelCatalog, ModelCatalogError> {
    let client = Client::builder().timeout(Duration::from_secs(30)).build().map_err(|_| {
        ModelCatalogError::new("NETWORK_ERROR", "ForgeMind could not initialize the Nebius catalog client.")
    })?;
    let response = client.get(url).bearer_auth(api_key).send().await.map_err(|_| {
        ModelCatalogError::new("NETWORK_ERROR", "ForgeMind could not reach the Nebius Token Factory model catalog.")
    })?;
    let status = response.status();
    if !status.is_success() {
        let code = match status.as_u16() {
            401 | 403 => "AUTHENTICATION_FAILED",
            429 => "RATE_LIMITED",
            _ => "PROVIDER_ERROR",
        };
        return Err(ModelCatalogError::new(code, "Nebius Token Factory could not refresh the model catalog."));
    }
    let provider: ProviderCatalog = response.json().await.map_err(|_| {
        ModelCatalogError::new("MALFORMED_RESPONSE", "Nebius Token Factory returned a model catalog ForgeMind could not read.")
    })?;
    if provider.object != "list" {
        return Err(ModelCatalogError::new("MALFORMED_RESPONSE", "Nebius Token Factory returned an unsupported model catalog shape."));
    }
    normalize(provider)
}

fn normalize(provider: ProviderCatalog) -> Result<ModelCatalog, ModelCatalogError> {
    let refreshed_at = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let mut seen = HashSet::new();
    let mut models = Vec::new();
    for provider_model in provider.data {
        let id = provider_model.id.trim();
        if !model_registry::valid_model_id(id) || !seen.insert(id.to_owned()) {
            return Err(ModelCatalogError::new("MALFORMED_RESPONSE", "Nebius Token Factory returned an invalid or duplicate model identifier."));
        }
        models.push(AvailableModel {
            provider_model_id: id.to_owned(),
            display_name: id.to_owned(),
            provider: model_registry::NEBIUS_PROVIDER_ID.to_owned(),
            discovered_at: refreshed_at.clone(),
            availability: "AVAILABLE".to_owned(),
        });
    }
    models.sort_by(|left, right| left.provider_model_id.cmp(&right.provider_model_id));
    Ok(ModelCatalog { format_version: 1, refreshed_at, models })
}

fn load_catalog(path: &Path) -> Result<Option<ModelCatalog>, ModelCatalogError> {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(ModelCatalogError::storage()),
    };
    let catalog: ModelCatalog = serde_json::from_str(&contents).map_err(|_| ModelCatalogError::storage())?;
    if catalog.format_version != 1 { return Err(ModelCatalogError::storage()); }
    Ok(Some(catalog))
}

fn save_catalog(path: &Path, catalog: &ModelCatalog) -> Result<(), ModelCatalogError> {
    let parent = path.parent().ok_or_else(ModelCatalogError::storage)?;
    fs::create_dir_all(parent).map_err(|_| ModelCatalogError::storage())?;
    let bytes = serde_json::to_vec_pretty(catalog).map_err(|_| ModelCatalogError::storage())?;
    fs::write(path, bytes).map_err(|_| ModelCatalogError::storage())
}

pub fn catalog_contains(model_id: &str) -> Result<bool, ModelCatalogError> {
    Ok(load_catalog(&application_catalog_path()?)?.is_some_and(|catalog| {
        catalog.models.iter().any(|model| model.provider_model_id == model_id.trim())
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;
    use tempfile::TempDir;

    fn serve_once(body: &'static str) -> (String, thread::JoinHandle<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0_u8; 4096];
            let length = stream.read(&mut buffer).unwrap();
            let request = String::from_utf8_lossy(&buffer[..length]).to_string();
            let response = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", body.len(), body);
            stream.write_all(response.as_bytes()).unwrap();
            request
        });
        (format!("http://{address}/v1/models"), handle)
    }

    #[tokio::test]
    async fn refresh_makes_one_authenticated_get_and_normalizes_only_ids() {
        let (url, handle) = serve_once(r#"{"object":"list","data":[{"id":"vendor/z","pricing":{"prompt":"secret"}},{"id":"vendor/a"}]}"#);
        let catalog = fetch_catalog(&url, "placeholder-secret").await.unwrap();
        let request = handle.join().unwrap();
        assert!(request.starts_with("GET /v1/models HTTP/1.1"));
        assert!(request.to_ascii_lowercase().contains("authorization: bearer placeholder-secret"));
        assert_eq!(catalog.models.iter().map(|model| model.provider_model_id.as_str()).collect::<Vec<_>>(), vec!["vendor/a", "vendor/z"]);
        assert!(!serde_json::to_string(&catalog).unwrap().contains("pricing"));
    }

    #[tokio::test]
    async fn malformed_catalog_fails_without_overwriting_cache() {
        let temp = TempDir::new().unwrap();
        let path = temp.path().join(CATALOG_FILE_NAME);
        let existing = normalize(ProviderCatalog { object: "list".to_owned(), data: vec![ProviderModel { id: "vendor/known".to_owned() }] }).unwrap();
        save_catalog(&path, &existing).unwrap();
        let (url, handle) = serve_once(r#"{"object":"list","data":[{"id":"https://bad.example/model"}]}"#);
        assert_eq!(fetch_catalog(&url, "placeholder").await.unwrap_err().code, "MALFORMED_RESPONSE");
        handle.join().unwrap();
        assert_eq!(load_catalog(&path).unwrap(), Some(existing));
    }
}
