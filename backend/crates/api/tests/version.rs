use axum::{body::to_bytes, http::StatusCode};
use sqlx::PgPool;

use crate::common::router::TestRouter;

mod common;

#[sqlx::test]
#[test_log::test]
async fn version(db_pool: PgPool) {
    let router = TestRouter::new(db_pool);
    let response = router.get("/version").await;
    assert_eq!(response.status(), StatusCode::OK);

    let resp = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let text = String::from_utf8(resp.to_vec()).unwrap();
    assert_eq!(text.split('.').count(), 3);
}
