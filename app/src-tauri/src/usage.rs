use crate::ai::{AIError, AIResponse};
use crate::model_registry::{ModelEntry, ModelPricing};
use crate::structured_output::StructuredOutputDiagnostics;
use chrono::{SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::{self, BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const USAGE_FILE_NAME: &str = "usage-v1.jsonl";
static USAGE_FILE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskCategory {
    General,
    ProjectInterview,
    AiBehavior,
    NpcDesign,
    ExploitAnalysis,
    EncounterDesign,
    Balance,
    Progression,
    TechnicalAnalysis,
    Alignment,
    FeatureContract,
    NewProjectCoreLoop,
    NewProjectDesignPillars,
    NarrativeWorkspace,
    KnowledgeImport,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageRecord {
    pub timestamp: String,
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    pub provider: String,
    pub model_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_category: Option<TaskCategory>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_cost_usd: Option<f64>,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structured_output_success: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub structured_output_diagnostics: Option<StructuredOutputDiagnostics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_category: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageTotals {
    pub requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_tokens: u64,
    pub estimated_cost_usd: Option<f64>,
    pub average_latency_ms: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsageSummary {
    pub provider: String,
    pub model_id: String,
    #[serde(flatten)]
    pub totals: UsageTotals,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    pub session: UsageTotals,
    pub project: Option<UsageTotals>,
    pub by_model: Vec<ModelUsageSummary>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageError {
    pub code: &'static str,
    pub message: String,
}

impl UsageError {
    fn storage() -> Self {
        Self {
            code: "USAGE_STORAGE_FAILED",
            message: "ForgeMind could not access its local usage history.".to_owned(),
        }
    }
}

pub fn application_usage_path() -> Result<PathBuf, UsageError> {
    #[cfg(target_os = "windows")]
    let base = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);

    #[cfg(target_os = "macos")]
    let base = std::env::var_os("HOME")
        .map(PathBuf::from)
        .map(|home| home.join("Library").join("Application Support"));

    #[cfg(all(unix, not(target_os = "macos")))]
    let base = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME")
                .map(PathBuf::from)
                .map(|home| home.join(".local").join("share"))
        });

    base.map(|directory| directory.join("ForgeMind").join(USAGE_FILE_NAME))
        .ok_or_else(UsageError::storage)
}

pub fn estimate_cost(
    pricing: Option<&ModelPricing>,
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
) -> Option<f64> {
    let pricing = pricing?;
    let input_tokens = input_tokens? as f64;
    let output_tokens = output_tokens? as f64;
    Some(
        input_tokens / 1_000_000.0 * pricing.input_usd_per_million_tokens
            + output_tokens / 1_000_000.0 * pricing.output_usd_per_million_tokens,
    )
}

pub fn record_for_result(
    session_id: &str,
    project_id: Option<&str>,
    model: &ModelEntry,
    task_category: Option<TaskCategory>,
    result: &Result<AIResponse, AIError>,
) -> UsageRecord {
    let project_id = project_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    match result {
        Ok(response) => UsageRecord {
            timestamp: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            session_id: session_id.to_owned(),
            project_id,
            provider: model.provider.clone(),
            model_id: model.model_id.clone(),
            task_category,
            input_tokens: response.input_tokens,
            output_tokens: response.output_tokens,
            total_tokens: response.total_tokens,
            latency_ms: Some(response.latency_ms),
            estimated_cost_usd: estimate_cost(
                model.pricing.as_ref(),
                response.input_tokens,
                response.output_tokens,
            ),
            success: true,
            structured_output_success: None,
            structured_output_diagnostics: None,
            error_category: None,
        },
        Err(error) => UsageRecord {
            timestamp: Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            session_id: session_id.to_owned(),
            project_id,
            provider: model.provider.clone(),
            model_id: model.model_id.clone(),
            task_category,
            input_tokens: None,
            output_tokens: None,
            total_tokens: None,
            latency_ms: None,
            estimated_cost_usd: None,
            success: false,
            structured_output_success: None,
            structured_output_diagnostics: None,
            error_category: Some(error.code.clone()),
        },
    }
}

pub fn append_record(path: &Path, record: &UsageRecord) -> Result<(), UsageError> {
    let _guard = USAGE_FILE_LOCK.lock().map_err(|_| UsageError::storage())?;
    append_record_unlocked(path, record)
}

fn append_record_unlocked(path: &Path, record: &UsageRecord) -> Result<(), UsageError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| UsageError::storage())?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|_| UsageError::storage())?;
    serde_json::to_writer(&mut file, record).map_err(|_| UsageError::storage())?;
    file.write_all(b"\n").map_err(|_| UsageError::storage())
}

pub fn load_records(path: &Path) -> Result<Vec<UsageRecord>, UsageError> {
    let _guard = USAGE_FILE_LOCK.lock().map_err(|_| UsageError::storage())?;
    let file = match OpenOptions::new().read(true).open(path) {
        Ok(file) => file,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(_) => return Err(UsageError::storage()),
    };
    BufReader::new(file)
        .lines()
        .map(|line| {
            let line = line.map_err(|_| UsageError::storage())?;
            serde_json::from_str(&line).map_err(|_| UsageError::storage())
        })
        .collect()
}

fn totals(records: &[&UsageRecord]) -> UsageTotals {
    let requests = records.len() as u64;
    let successful_requests = records.iter().filter(|record| record.success).count() as u64;
    let failed_requests = requests - successful_requests;
    let input_tokens = records.iter().filter_map(|record| record.input_tokens).sum();
    let output_tokens = records.iter().filter_map(|record| record.output_tokens).sum();
    let total_tokens = records.iter().filter_map(|record| record.total_tokens).sum();
    let known_cost: f64 = records
        .iter()
        .filter_map(|record| record.estimated_cost_usd)
        .sum();
    let cost_is_unknown = records
        .iter()
        .any(|record| record.success && record.estimated_cost_usd.is_none());
    let latencies = records
        .iter()
        .filter_map(|record| record.latency_ms)
        .collect::<Vec<_>>();
    let average_latency_ms = if latencies.is_empty() {
        None
    } else {
        Some(latencies.iter().sum::<u64>() / latencies.len() as u64)
    };

    UsageTotals {
        requests,
        successful_requests,
        failed_requests,
        input_tokens,
        output_tokens,
        total_tokens,
        estimated_cost_usd: (!cost_is_unknown).then_some(known_cost),
        average_latency_ms,
    }
}

pub fn summarize(records: &[UsageRecord], session_id: &str, project_id: Option<&str>) -> UsageSummary {
    let session_records = records
        .iter()
        .filter(|record| record.session_id == session_id)
        .collect::<Vec<_>>();
    let project_records = project_id.map(|project_id| {
        records
            .iter()
            .filter(|record| record.project_id.as_deref() == Some(project_id))
            .collect::<Vec<_>>()
    });
    let model_source = project_records.as_ref().unwrap_or(&session_records);
    let mut grouped: BTreeMap<(&str, &str), Vec<&UsageRecord>> = BTreeMap::new();
    for record in model_source {
        grouped
            .entry((&record.provider, &record.model_id))
            .or_default()
            .push(record);
    }
    let by_model = grouped
        .into_iter()
        .map(|((provider, model_id), records)| ModelUsageSummary {
            provider: provider.to_owned(),
            model_id: model_id.to_owned(),
            totals: totals(&records),
        })
        .collect();

    UsageSummary {
        session: totals(&session_records),
        project: project_records.as_ref().map(|records| totals(records)),
        by_model,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn model(pricing: Option<ModelPricing>) -> ModelEntry {
        ModelEntry {
            provider: "provider".to_owned(),
            model_id: "vendor/model".to_owned(),
            display_name: "Model".to_owned(),
            family: "Family".to_owned(),
            vendor: Some("Vendor".to_owned()),
            category: None,
            availability: "configured".to_owned(),
            pricing,
            notes: None,
            capabilities: crate::model_registry::ModelCapabilities::default(),
            enabled: true,
        }
    }

    fn response() -> AIResponse {
        AIResponse {
            text: "private response".to_owned(),
            model: "vendor/model".to_owned(),
            input_tokens: Some(1_000),
            output_tokens: Some(2_000),
            total_tokens: Some(3_000),
            latency_ms: 40,
            finish_reason: Some("stop".to_owned()),
            provider_request_id: None,
        }
    }

    #[test]
    fn cost_calculation_uses_explicit_per_million_prices() {
        let pricing = ModelPricing {
            input_usd_per_million_tokens: 2.0,
            output_usd_per_million_tokens: 4.0,
        };
        assert_eq!(estimate_cost(Some(&pricing), Some(1_000), Some(2_000)), Some(0.01));
    }

    #[test]
    fn unknown_pricing_returns_no_cost() {
        assert_eq!(estimate_cost(None, Some(1_000), Some(2_000)), None);
    }

    #[test]
    fn successful_response_metadata_creates_a_usage_record() {
        let record = record_for_result(
            "session",
            Some("project"),
            &model(None),
            Some(TaskCategory::AiBehavior),
            &Ok(response()),
        );
        assert!(record.success);
        assert_eq!(record.total_tokens, Some(3_000));
        assert_eq!(record.latency_ms, Some(40));
        assert_eq!(record.task_category, Some(TaskCategory::AiBehavior));
    }

    #[test]
    fn failed_request_records_only_a_safe_error_category() {
        let result = Err(AIError {
            code: "RATE_LIMITED".to_owned(),
            message: "secret-bearing provider message".to_owned(),
            diagnostics: None,
        });
        let record = record_for_result("session", None, &model(None), None, &result);
        let serialized = serde_json::to_string(&record).unwrap();
        assert_eq!(record.error_category.as_deref(), Some("RATE_LIMITED"));
        assert!(!serialized.contains("secret-bearing"));
    }

    #[test]
    fn task_category_is_optional() {
        let record = record_for_result("session", None, &model(None), None, &Ok(response()));
        assert_eq!(record.task_category, None);
    }

    #[test]
    fn project_interview_task_category_is_stable() {
        assert_eq!(
            serde_json::to_string(&TaskCategory::ProjectInterview).unwrap(),
            "\"project_interview\""
        );
    }

    #[test]
    fn creator_task_categories_and_structured_output_evidence_are_stable() {
        assert_eq!(serde_json::to_string(&TaskCategory::NewProjectCoreLoop).unwrap(), "\"new_project_core_loop\"");
        assert_eq!(serde_json::to_string(&TaskCategory::NewProjectDesignPillars).unwrap(), "\"new_project_design_pillars\"");
        let mut record = record_for_result("session", None, &model(None), Some(TaskCategory::NewProjectCoreLoop), &Ok(response()));
        record.structured_output_success = Some(false);
        let serialized = serde_json::to_string(&record).unwrap();
        assert!(serialized.contains("\"structuredOutputSuccess\":false"));
        assert!(!serialized.contains("private response"));
    }

    #[test]
    fn prompt_response_and_secrets_are_not_persisted() {
        let directory = TempDir::new().unwrap();
        let path = directory.path().join(USAGE_FILE_NAME);
        let record = record_for_result("session", None, &model(None), None, &Ok(response()));
        append_record(&path, &record).unwrap();
        let contents = fs::read_to_string(path).unwrap();
        assert!(!contents.contains("private response"));
        assert!(!contents.contains("prompt"));
        assert!(!contents.contains("apiKey"));
        assert!(!contents.contains("authorization"));
    }

    #[test]
    fn usage_round_trips_through_local_json_lines_storage() {
        let directory = TempDir::new().unwrap();
        let path = directory.path().join(USAGE_FILE_NAME);
        let record = record_for_result("session", Some("project"), &model(None), None, &Ok(response()));
        append_record(&path, &record).unwrap();
        assert_eq!(load_records(&path).unwrap(), vec![record]);
    }

    #[test]
    fn usage_aggregates_by_session_project_and_model() {
        let priced = model(Some(ModelPricing {
            input_usd_per_million_tokens: 2.0,
            output_usd_per_million_tokens: 4.0,
        }));
        let first = record_for_result("current", Some("project-a"), &priced, None, &Ok(response()));
        let mut second = record_for_result("other", Some("project-a"), &priced, None, &Ok(response()));
        second.latency_ms = Some(60);
        let third = record_for_result("current", Some("project-b"), &priced, None, &Ok(response()));

        let summary = summarize(&[first, second, third], "current", Some("project-a"));

        assert_eq!(summary.session.requests, 2);
        assert_eq!(summary.project.as_ref().unwrap().requests, 2);
        assert_eq!(summary.by_model[0].totals.requests, 2);
        assert_eq!(summary.by_model[0].totals.total_tokens, 6_000);
        assert_eq!(summary.by_model[0].totals.average_latency_ms, Some(50));
    }
}
