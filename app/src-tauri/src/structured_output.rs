#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ExtractionError {
    NoObject,
    MultipleObjects,
    NonObjectRoot,
    UnbalancedObject,
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
