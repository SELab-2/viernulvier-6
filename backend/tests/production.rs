use axum::http::StatusCode;
use sqlx::PgPool;
use viernulvier_api::dto::production::ProductionPayload;

use crate::common::{into_struct::IntoStruct, router::TestRouter};

mod common;

#[sqlx::test(fixtures("productions"))]
#[test_log::test]
async fn get_all(db: PgPool) {
    let none = TestRouter::new(db.clone());
    let response = none.get("/productions").await;
    assert_eq!(response.status(), StatusCode::OK);

    let data: Vec<ProductionPayload> = response.into_struct().await;
    assert_eq!(data.len(), 5);
}
