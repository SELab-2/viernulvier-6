use sqlx::FromRow;

#[derive(Debug, FromRow, PartialEq)]
pub struct User {
    pub id: i32,
    pub username: String,
}

pub struct UserCreate {
    pub username: String,
}

#[derive(Debug)]
pub struct UserPatch {
    pub username: String,
}
