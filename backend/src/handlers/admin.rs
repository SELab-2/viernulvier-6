use crate::{AppState, error::AppError, error::ErrorResponse, extractors::auth::AuthUser};
use axum::{Json, extract::State};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct AdminResponse {
    pub id: String,
    pub email: String,
}

#[utoipa::path(
    method(get),
    path = "/admin/me",
    operation_id = "get_admin_info",
    tag = "Admin",
    description = "Receive admin info of the logged in user",
    responses(
        (status = 200, description = "Success", body = AdminResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn admin(
    auth: AuthUser,
    _state: State<AppState>,
) -> Result<Json<AdminResponse>, AppError> {
    Ok(Json(AdminResponse {
        id: auth.id.to_string(),
        email: auth.email
    }))
}
