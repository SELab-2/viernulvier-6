use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use axum::{Json};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    error::AppError,
    error::ErrorResponse,
    extractors::auth::{EditorUser},
};
use database::Database;
use database::models::user::{UserCreate, UserRole};

#[derive(Serialize, ToSchema)]
pub struct EditorResponse {
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
    path = "/editor/me",
    operation_id = "get_editor_info",
    tag = "Editor",
    description = "Receive editor info of the logged in user",
    responses(
        (status = 200, description = "Success", body = EditorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn editor_me(
    EditorUser(editor): EditorUser,
) -> Result<Json<EditorResponse>, AppError> {
    Ok(Json(EditorResponse {
        id: editor.id.to_string(),
        email: editor.email,
        role: editor.role,
    }))
}

#[utoipa::path(
    method(post),
    path = "/editor/create",
    operation_id = "create_editor",
    tag = "Editor",
    description = "Create a new editor user (Admin only)",
    request_body = CreateEditorRequest,
    responses(
        (status = 200, description = "Editor created successfully", body = EditorResponse),
        (status = 401, description = "Unauthorized - Not an admin", body = ErrorResponse),
        (status = 500, description = "Internal Server Error", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn create_editor(
    db: Database,
    Json(payload): Json<CreateEditorRequest>,
) -> Result<Json<EditorResponse>, AppError> {
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

    Ok(Json(EditorResponse {
        id: user.id.to_string(),
        email: user.email,
        role: user.role,
    }))
}