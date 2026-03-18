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
}

impl From<ormlite::Error> for DatabaseError {
    fn from(value: ormlite::Error) -> Self {
        match value {
            ormlite::Error::SqlxError(sqlx::Error::RowNotFound) => DatabaseError::NotFound,
            ormlite::Error::SqlxError(e) => DatabaseError::Sqlx(e),
            _ => DatabaseError::Ormlite(value),
        }
    }
}
