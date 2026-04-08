use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Sqlx error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("Migration error: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),

    #[error("Ormlite error: {0}")]
    Ormlite(ormlite::Error),

    #[error("Query returned no rows")]
    NotFound,

    #[error("Bad request: {0}")]
    BadRequest(String),
}

impl From<ormlite::Error> for DatabaseError {
    fn from(value: ormlite::Error) -> Self {
        match value {
            ormlite::Error::SqlxError(sqlx::Error::RowNotFound) => Self::NotFound,
            ormlite::Error::SqlxError(e) => Self::Sqlx(e),
            _ => Self::Ormlite(value),
        }
    }
}
