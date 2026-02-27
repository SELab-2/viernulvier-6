use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
}

pub struct UserCreate {
    pub username: String,
    pub email: String,
    pub password_hash: String,
}

#[derive(Debug)]
pub struct UserPatch {
    pub username: String,
}
