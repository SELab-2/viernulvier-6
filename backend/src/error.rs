use std::io::Error as IoError;
use thiserror::Error;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use database::error::DatabaseError;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error")]
    Io(#[from] IoError),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Database error: {0}")]
    Database(DatabaseError),

    #[error("Env var {0} not set :(")]
    Env(String),

    #[error("Axum error: {0}")]
    Axum(#[from] axum::Error),

    #[error("The requested resource was not found")]
    NotFound,

    #[error("Payload error: {0}")]
    PayloadError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // log!
        tracing::error!("{}", self);
        self.error_page().into_response()
    }
}

impl AppError {
    fn error_page(&self) -> (StatusCode, &'static str) {
        let (status, msg) = match self {
            Self::PayloadError(_) => (StatusCode::BAD_REQUEST, "Payload error"),
            Self::NotFound => (StatusCode::NOT_FOUND, "We couldn't find that."),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Please help I have internal errors. D:",
            ),
        };

        (status, msg)
    }
}

impl From<DatabaseError> for AppError {
    fn from(value: DatabaseError) -> Self {
        match value {
            DatabaseError::NotFound => Self::NotFound,
            other => Self::Database(other),
        }
    }
}
