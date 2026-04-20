use aws_sdk_s3::Client;
use uuid::Uuid;

/// Build the S3 key for a CSV import file.
///
/// Format: `imports/{session_id}/{sanitised_filename}`
///
/// Sanitisation rules (applied inside this function so they are unit-testable
/// without a live S3 client):
/// - Every `/` and `.` character is stripped from `filename` to prevent path
///   traversal (e.g. `"../../etc/passwd"` → `"etcpasswd"`).
/// - If the sanitised result is empty, the fallback `"file.csv"` is used.
pub fn csv_key(session_id: Uuid, filename: &str) -> String {
    let sanitised: String = filename
        .chars()
        .filter(|&c| c != '/' && c != '.')
        .collect();

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
) -> anyhow::Result<String> {
    let key = csv_key(session_id, filename);

    client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .body(bytes.into())
        .content_type("text/csv")
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("s3 put_csv failed: {e}"))?;

    Ok(key)
}

/// Download a CSV file from S3 and return its raw bytes.
pub async fn get_csv(client: &Client, bucket: &str, s3_key: &str) -> anyhow::Result<Vec<u8>> {
    let obj = client
        .get_object()
        .bucket(bucket)
        .key(s3_key)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("s3 get_csv failed: {e}"))?;

    let bytes = obj
        .body
        .collect()
        .await
        .map_err(|e| anyhow::anyhow!("s3 get_csv body collect failed: {e}"))?
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
        let key = csv_key(id, "file.csv");
        assert_eq!(
            key,
            format!("imports/{id}/filecsv"),
            "dots are stripped from filename"
        );
    }

    #[test]
    fn csv_key_sanitises_path_traversal() {
        // "../../etc/passwd" → dots and slashes stripped → "etcpasswd"
        let id = Uuid::nil();
        let key = csv_key(id, "../../etc/passwd");
        assert_eq!(key, format!("imports/{id}/etcpasswd"));
    }

    #[test]
    fn csv_key_sanitises_slashes() {
        // "dir/file.csv" → slashes and dots stripped → "dirfilecsv"
        let id = Uuid::nil();
        let key = csv_key(id, "dir/file.csv");
        assert_eq!(key, format!("imports/{id}/dirfilecsv"));
    }

    #[test]
    fn csv_key_empty_filename_defaults() {
        let id = Uuid::nil();
        let key = csv_key(id, "");
        assert_eq!(key, format!("imports/{id}/file.csv"));
    }
}
