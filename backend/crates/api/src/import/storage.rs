use std::path::Path;

use aws_sdk_s3::Client;
use uuid::Uuid;

use crate::error::AppError;

/// Build the S3 key for a CSV import file.
///
/// Format: `imports/{session_id}/{sanitised_filename}`
///
/// Sanitisation rules:
/// - `Path::new(filename).file_name()` extracts the bare basename, eliminating
///   any `/`- or `\`-separated path prefix (including `../` traversal sequences).
/// - Characters outside `[A-Za-z0-9._-]` are replaced with `_`.
/// - A leading `.` (dotfile / hidden file) is replaced with `_`.
/// - If the sanitised result is empty, the fallback `"file.csv"` is used.
pub fn csv_key(session_id: Uuid, filename: &str) -> String {
    // Strip path components — Path::new("../../etc/passwd").file_name() → Some("passwd").
    // Returns None for "", ".", "..", or paths ending in a separator.
    let basename = Path::new(filename)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    // Replace any character outside [A-Za-z0-9._-] with '_'.
    let mut sanitised: String = basename
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();

    // Reject leading dot (dotfile / hidden file).
    if sanitised.starts_with('.') {
        sanitised = format!("_{}", &sanitised[1..]);
    }

    let safe_name = if sanitised.is_empty() {
        "file.csv".to_owned()
    } else {
        sanitised
    };

    format!("imports/{session_id}/{safe_name}")
}

/// Upload a CSV file to S3 and return the generated key.
pub async fn put_csv(
    client: &Client,
    bucket: &str,
    session_id: Uuid,
    filename: &str,
    bytes: Vec<u8>,
) -> Result<String, AppError> {
    let key = csv_key(session_id, filename);

    client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .body(bytes.into())
        .content_type("text/csv")
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("s3 put_csv failed: {e}")))?;

    Ok(key)
}

/// Download a CSV file from S3 and return its raw bytes.
pub async fn get_csv(client: &Client, bucket: &str, s3_key: &str) -> Result<Vec<u8>, AppError> {
    let obj = client
        .get_object()
        .bucket(bucket)
        .key(s3_key)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("s3 get_csv failed: {e}")))?;

    let bytes = obj
        .body
        .collect()
        .await
        .map_err(|e| AppError::Internal(format!("s3 get_csv body collect failed: {e}")))?
        .into_bytes()
        .to_vec();

    Ok(bytes)
}

// ---------------------------------------------------------------------------
// Unit tests (no live S3 needed — only csv_key is exercised here)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::csv_key;

    #[test]
    fn csv_key_basic() {
        let id = Uuid::nil();
        let key = csv_key(id, "productions.csv");
        assert_eq!(
            key,
            format!("imports/{id}/productions.csv"),
            "extension must be preserved"
        );
    }

    #[test]
    fn csv_key_strips_path_traversal() {
        // Path::new("../../etc/passwd").file_name() → "passwd"
        let id = Uuid::nil();
        let key = csv_key(id, "../../etc/passwd");
        assert!(
            !key.contains('/') || key.starts_with("imports/"),
            "must not contain extra slashes"
        );
        assert!(!key.contains(".."), "must not contain ..");
        // Only the "imports/{id}/" prefix and the bare filename remain.
        assert_eq!(key, format!("imports/{id}/passwd"));
    }

    #[test]
    fn csv_key_strips_directory_prefix() {
        // Slash-containing input: basename only survives.
        let id = Uuid::nil();
        let key = csv_key(id, "dir/file.csv");
        assert_eq!(key, format!("imports/{id}/file.csv"));
    }

    #[test]
    fn csv_key_empty_filename_defaults() {
        let id = Uuid::nil();
        let key = csv_key(id, "");
        assert_eq!(key, format!("imports/{id}/file.csv"));
    }

    #[test]
    fn csv_key_dotdot_alone_defaults() {
        // ".." → file_name() returns None → fallback
        let id = Uuid::nil();
        let key = csv_key(id, "..");
        assert_eq!(key, format!("imports/{id}/file.csv"));
    }
}
