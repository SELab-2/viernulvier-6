//! Integration tests for POST /import/sessions (Task 6.2).
//!
//! The happy-path (200 + DB row + S3 key) requires a live S3/Garage instance.
//! All tests here run against a real PostgreSQL database with `s3_client = None`
//! (the AppState default in the test env).
//!
//! Test coverage:
//! 1. upload_session_rejects_unauthenticated      — 401 (no cookie)
//! 2. upload_session_rejects_missing_entity_type  — 400 (file only, no entity_type)
//! 3. upload_session_rejects_unsupported_entity   — 400 (entity_type = "lolwut")
//! 4. upload_session_rejects_file_too_large       — 400 (> 10 MiB)
//! 5. upload_session_rejects_malformed_csv        — 400 (empty file = no headers)
//! 6. upload_session_errors_when_s3_not_configured — 500 (all pre-S3 checks pass)

mod common;

use axum::{body::Body, http::StatusCode};
use http_body_util::BodyExt;
use sqlx::PgPool;

use crate::common::router::TestRouter;

// ─── Multipart builders ───────────────────────────────────────────────────────

/// Builds a full two-field multipart body: `entity_type` + `file`.
fn build_multipart(entity_type: &str, filename: &str, csv: &[u8]) -> (String, Vec<u8>) {
    let boundary = "----TestBoundary12345";
    let mut body = Vec::new();

    // entity_type field
    body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
    body.extend_from_slice(b"Content-Disposition: form-data; name=\"entity_type\"\r\n\r\n");
    body.extend_from_slice(entity_type.as_bytes());
    body.extend_from_slice(b"\r\n");

    // file field
    body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
    body.extend_from_slice(
        format!("Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n")
            .as_bytes(),
    );
    body.extend_from_slice(b"Content-Type: text/csv\r\n\r\n");
    body.extend_from_slice(csv);
    body.extend_from_slice(b"\r\n");
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());

    (format!("multipart/form-data; boundary={boundary}"), body)
}

/// Builds a multipart body with ONLY the `file` field (entity_type is absent).
fn build_multipart_file_only(filename: &str, csv: &[u8]) -> (String, Vec<u8>) {
    let boundary = "----TestBoundary99999";
    let mut body = Vec::new();

    body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
    body.extend_from_slice(
        format!("Content-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n")
            .as_bytes(),
    );
    body.extend_from_slice(b"Content-Type: text/csv\r\n\r\n");
    body.extend_from_slice(csv);
    body.extend_from_slice(b"\r\n");
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());

    (format!("multipart/form-data; boundary={boundary}"), body)
}

async fn body_string(resp: axum::response::Response<Body>) -> String {
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    String::from_utf8_lossy(&bytes).to_string()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

/// 1. No auth cookie → 401 Unauthorized.
#[sqlx::test]
async fn upload_session_rejects_unauthenticated(pool: PgPool) {
    let r = TestRouter::new(pool);
    let (ct, body) = build_multipart("production", "test.csv", b"Titel\nHamlet");
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

/// 2. Authenticated but missing entity_type field → 400.
#[sqlx::test]
async fn upload_session_rejects_missing_entity_type(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let (ct, body) = build_multipart_file_only("test.csv", b"Titel\nHamlet");
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 3. Authenticated but unsupported entity_type → 400.
#[sqlx::test]
async fn upload_session_rejects_unsupported_entity(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let (ct, body) = build_multipart("lolwut", "test.csv", b"Titel\nHamlet");
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 4. File exceeds 10 MiB → 400.
#[sqlx::test]
async fn upload_session_rejects_file_too_large(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let big_csv = vec![b'x'; 10 * 1024 * 1024 + 1];
    let (ct, body) = build_multipart("production", "big.csv", &big_csv);
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 5. Malformed CSV (empty bytes → no headers) → 400.
#[sqlx::test]
async fn upload_session_rejects_malformed_csv(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let (ct, body) = build_multipart("production", "empty.csv", b"");
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// 6. All pre-S3 checks pass but S3 is not configured → 500.
///    Validates that the handler reaches and respects the S3 guard.
#[sqlx::test]
async fn upload_session_errors_when_s3_not_configured(pool: PgPool) {
    let r = TestRouter::as_editor(pool).await;
    let csv = b"Titel,Ondertitel\nHamlet,Een prins\n";
    let (ct, body) = build_multipart("production", "hamlet.csv", csv);
    let resp = r.post_multipart("/import/sessions", &ct, body).await;
    assert_eq!(resp.status(), StatusCode::INTERNAL_SERVER_ERROR);
    // Verify the body is a JSON error envelope (success: false)
    let text = body_string(resp).await;
    assert!(
        text.contains("\"success\":false"),
        "expected JSON error envelope: {text}"
    );
}
