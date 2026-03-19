use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    AppState,
    error::AppError,
    error::ErrorResponse,
    extractors::auth::{RequireAdmin, RequireEditor},
};
use database::Database;
use database::models::user::{UserCreate, UserRole};

#[derive(Serialize, ToSchema)]
pub struct AdminResponse {
    pub id: String,
    pub email: String,
    pub role: UserRole,
}

#[derive(Deserialize, ToSchema)]
pub struct CreateEditorRequest {
    pub username: String,
    pub email: String,
    pub password: String,
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
    RequireEditor(admin): RequireEditor,
    _state: State<AppState>,
) -> Result<Json<AdminResponse>, AppError> {
    Ok(Json(AdminResponse {
        id: admin.id.to_string(),
        email: admin.email,
        role: admin.role,
    }))
}

#[utoipa::path(
    method(post),
    path = "/admin/create",
    operation_id = "create_editor",
    tag = "Admin",
    description = "Create a new editor user (Admin only)",
    request_body = CreateEditorRequest,
    responses(
        (status = 200, description = "Editor created successfully", body = AdminResponse),
        (status = 401, description = "Unauthorized - Not an admin", body = ErrorResponse),
        (status = 500, description = "Internal Server Error", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn create_editor(
    _admin: RequireAdmin,
    db: Database,
    Json(payload): Json<CreateEditorRequest>,
) -> Result<Json<AdminResponse>, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| AppError::Internal("Failed to hash password".into()))?
        .to_string();

    let user = db
        .users()
        .create(UserCreate {
            username: payload.username,
            email: payload.email,
            password_hash,
            role: UserRole::Editor,
        })
        .await
        .map_err(|e| {
            AppError::Internal(format!("Could not create editor: {}", e))
        })?;

    Ok(Json(AdminResponse {
        id: user.id.to_string(),
        email: user.email,
        role: user.role,
    }))
}