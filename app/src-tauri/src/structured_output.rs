use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ExtractionError {
    NoObject,
    MultipleObjects,
    NonObjectRoot,
    UnbalancedObject,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StructuredOutputExtractionStage {
    NoJsonObject,
    JsonParseFailed,
    DeserializationFailed,
    SemanticValidationFailed,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum StructuredOutputValidationCode {
    NoJsonObject,
    JsonParseFailed,
    InvalidSchema,
    MissingCandidates,
    InvalidCandidatesType,
    InvalidCandidate,
    InvalidCandidateType,
    InvalidTitle,
    InvalidContent,
    InvalidSection,
    InvalidSourceRefs,
    UnknownSourceRef,
    InvalidConfidence,
    InvalidNote,
    MissingMode,
    InvalidMode,
    InvalidMessage,
    InvalidQuestions,
    InvalidSourceRef,
    InvalidProposal,
    UnknownField,
    ExcessiveCandidates,
    SpeculativeKnowledgeRejected,
    ResponseTooLarge,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StructuredOutputUsageReference {
    pub session_id: String,
    pub timestamp: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StructuredOutputDiagnostics {
    pub extraction_stage: StructuredOutputExtractionStage,
    pub validation_code: StructuredOutputValidationCode,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub top_level_keys: Vec<String>,
    #[serde(default, skip_serializing_if = "is_zero")]
    pub unknown_field_count: usize,
    pub provider: String,
    pub model: String,
    pub response_character_count: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_reference: Option<StructuredOutputUsageReference>,
}

fn is_zero(value: &usize) -> bool {
    *value == 0
}

pub(crate) fn extract_single_json_object(text: &str) -> Result<&str, ExtractionError> {
    let trimmed = text.trim();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return if value.is_object() {
            Ok(trimmed)
        } else {
            Err(ExtractionError::NonObjectRoot)
        };
    }

    let bytes = trimmed.as_bytes();
    let mut candidates = Vec::new();
    let mut start = None;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (index, byte) in bytes.iter().enumerate() {
        if start.is_none() {
            match byte {
                b'{' => {
                    start = Some(index);
                    depth = 1;
                }
                b'}' => return Err(ExtractionError::UnbalancedObject),
                _ => {}
            }
            continue;
        }

        if in_string {
            if escaped {
                escaped = false;
            } else if *byte == b'\\' {
                escaped = true;
            } else if *byte == b'"' {
                in_string = false;
            }
            continue;
        }

        match byte {
            b'"' => in_string = true,
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    let object_start = start.take().expect("object start exists");
                    candidates.push((object_start, index + 1));
                }
            }
            _ => {}
        }
    }

    if start.is_some() || in_string {
        return Err(ExtractionError::UnbalancedObject);
    }

    match candidates.as_slice() {
        [] => Err(ExtractionError::NoObject),
        [(start, end)] => Ok(&trimmed[*start..*end]),
        _ => Err(ExtractionError::MultipleObjects),
    }
}
