use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(table = "users", insert = "UserCreate")]
pub struct User {
    #[ormlite(primary_key)]
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub password_hash: String,
}

#[derive(Debug)]
pub struct UserPatch {
    pub username: String,
}
