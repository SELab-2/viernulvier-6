use axum::{extract::State, Json};
use serde::Serialize;
use crate::{AppState, error::AppError, extractors::auth::AuthUser};

#[derive(Serialize)]
pub struct AdminResponse {
    pub user_id: String,
    pub email: String,
}

pub struct AdminHandler;

impl AdminHandler {
    pub async fn admin(
        auth: AuthUser,
        State(_): State<AppState>,
    ) -> Result<Json<AdminResponse>, AppError> {
        Ok(Json(AdminResponse {
            user_id: auth.user_id.to_string(),
            email: auth.email,
        }))
    }
}