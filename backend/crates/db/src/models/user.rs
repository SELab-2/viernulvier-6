use ormlite::Model;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, sqlx::Type, PartialEq, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Editor,
    User,
}

#[derive(Debug, Model, PartialEq)]
#[ormlite(table = "users", insert = "UserCreate")]
pub struct User {
    #[ormlite(primary_key)]
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub role: UserRole,
}

#[derive(Debug)]
pub struct UserPatch {
    pub username: String,
    pub role: Option<UserRole>,
}
