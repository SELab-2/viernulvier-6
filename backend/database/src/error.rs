use thiserror::Error;

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Sqlx error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("Migration error: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),

    #[error("Ormlite error: {0}")]
    Ormlist(#[from] ormlite::Error),

    #[error("Query returned no rows")]
    NotFound,
}
