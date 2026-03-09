use crate::{AppState, error::AppError, extractors::auth::AuthUser};
use axum::{Json, extract::State};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct AdminResponse {
    pub user_id: String,
    pub email: String,
}

#[utoipa::path(
    method(get),
    path = "/admin",
    tag = "Admin",
    description = "Admin dashboard",
    responses(
        (status = 200, description = "Success", body = AdminResponse)
    )
)]
pub async fn admin(
    auth: AuthUser,
    _state: State<AppState>,
) -> Result<Json<AdminResponse>, AppError> {
    Ok(Json(AdminResponse {
        user_id: auth.user_id.to_string(),
        email: auth.email,
    }))
}
