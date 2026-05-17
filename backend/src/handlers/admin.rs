use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString, rand_core::OsRng},
};
use axum::Json;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{error::AppError, error::ErrorResponse, extractors::auth::EditorUser};
use axum::extract::Path;
use database::Database;
use database::error::DatabaseError;
use database::models::user::{UserCreate, UserPatch, UserRole, UserSummary};
use uuid::Uuid;

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
pub async fn editor_me(EditorUser(editor): EditorUser) -> Result<Json<EditorResponse>, AppError> {
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
        .map_err(|e| AppError::Internal(format!("Could not create editor: {e}")))?;

    Ok(Json(EditorResponse {
        id: user.id.to_string(),
        email: user.email,
        role: user.role,
    }))
}

#[derive(Serialize, ToSchema)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
}

#[derive(Deserialize, ToSchema)]
pub struct UpdateUserRequest {
    pub username: String,
    pub role: UserRole,
}

#[derive(Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,
}

#[utoipa::path(
    method(post),
    path = "/users",
    operation_id = "create_user",
    tag = "Admin",
    description = "Create a new user (Admin only)",
    request_body = CreateUserRequest,
    responses(
        (status = 200, description = "User created", body = UserResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn create_user(
    db: Database,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
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
            role: payload.role,
        })
        .await
        .map_err(|e| AppError::Internal(format!("Could not create user: {e}")))?;

    Ok(Json(UserResponse {
        id: user.id.to_string(),
        username: user.username,
        email: user.email,
        role: user.role,
    }))
}

#[utoipa::path(
    method(get),
    path = "/users",
    operation_id = "list_users",
    tag = "Admin",
    description = "List all users (Admin only)",
    responses(
        (status = 200, description = "Success", body = Vec<UserResponse>),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn list_users(db: Database) -> Result<Json<Vec<UserResponse>>, AppError> {
    let users = db.users().list_summaries().await?;
    Ok(Json(
        users
            .into_iter()
            .map(|u| UserResponse {
                id: u.id.to_string(),
                username: u.username,
                email: u.email,
                role: u.role,
            })
            .collect(),
    ))
}

#[utoipa::path(
    method(put),
    path = "/users/{id}",
    operation_id = "update_user",
    tag = "Admin",
    description = "Update a user (Admin only)",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = UserResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 409, description = "Conflict", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn update_user(
    db: Database,
    state: axum::extract::State<crate::AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let target = db.users().by_id(id).await?;
    if target.role == UserRole::Admin && payload.role != UserRole::Admin {
        let admin_count = db.users().admin_count().await?;
        if admin_count <= 1 {
            return Err(AppError::Conflict(
                "Cannot change the role of the last admin user".into(),
            ));
        }
    }
    let role_changed = target.role != payload.role;

    let user = if role_changed {
        let mut tx = db.pool().begin().await.map_err(DatabaseError::from)?;

        let user: UserSummary = sqlx::query_as(
            "UPDATE users
             SET username = $1, role = $2
             WHERE id = $3
             RETURNING id, username, email, role",
        )
        .bind(&payload.username)
        .bind(&payload.role)
        .bind(id)
        .fetch_one(&mut *tx)
        .await
        .map_err(DatabaseError::from)?;

        sqlx::query(
            "INSERT INTO revoked_users (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO UPDATE SET revoked_at = NOW()",
        )
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(DatabaseError::from)?;

        tx.commit().await.map_err(DatabaseError::from)?;
        state.revoked.mark_revoked(id);
        user
    } else {
        let user = db
            .users()
            .patch(
                id,
                UserPatch {
                    username: payload.username,
                    role: Some(payload.role),
                },
            )
            .await?;

        UserSummary {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        }
    };

    Ok(Json(UserResponse {
        id: user.id.to_string(),
        username: user.username,
        email: user.email,
        role: user.role,
    }))
}

#[utoipa::path(
    method(delete),
    path = "/users/{id}",
    operation_id = "delete_user",
    tag = "Admin",
    description = "Delete a user (Admin only)",
    responses(
        (status = 204, description = "User deleted"),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 409, description = "Conflict", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("cookie_auth" = [])
    )
)]
pub async fn delete_user(
    db: Database,
    state: axum::extract::State<crate::AppState>,
    Path(id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    let user = db.users().by_id(id).await?;
    if user.role == UserRole::Admin {
        let admin_count = db.users().admin_count().await?;
        if admin_count <= 1 {
            return Err(AppError::Conflict(
                "Cannot delete the last admin user".into(),
            ));
        }
    }
    let mut tx = db.pool().begin().await.map_err(DatabaseError::from)?;

    sqlx::query(
        "INSERT INTO revoked_users (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET revoked_at = NOW()",
    )
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(DatabaseError::from)?;

    let delete_res = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(DatabaseError::from)?;
    if delete_res.rows_affected() == 0 {
        return Err(AppError::from(DatabaseError::NotFound));
    }

    tx.commit().await.map_err(DatabaseError::from)?;
    state.revoked.mark_revoked(id);
    Ok(axum::http::StatusCode::NO_CONTENT)
}
