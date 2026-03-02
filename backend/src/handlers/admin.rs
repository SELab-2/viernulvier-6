use axum::extract::State;

use crate::{AppState, error::AppError, extractors::auth::AuthUser};

pub struct AdminHandler;

impl AdminHandler {
    pub async fn admin(
        auth: AuthUser,
        State(_): State<AppState>,
    ) -> Result<String, AppError> {
        Ok(format!("Request from user: {} with email {}", auth.user_id, auth.email))
    }
}