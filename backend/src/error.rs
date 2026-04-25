use std::io::Error as IoError;
use thiserror::Error;

use serde::Serialize;
use utoipa::ToSchema;

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

    #[error("Unauthorized")]
    Unauthorized,

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

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Cryptographic error: {0}")]
    Crypto(String),
}

#[derive(Serialize, ToSchema)]
pub struct ErrorResponse {
    #[schema(example = "An error occurred during processing")]
    pub message: String,
    pub success: bool,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::error!("{}", self);

        let (status, msg) = self.error_details();

        (
            status,
            axum::Json(ErrorResponse {
                message: msg.to_string(),
                success: false,
            }),
        )
            .into_response()
    }
}

impl AppError {
    fn error_details(&self) -> (StatusCode, &'static str) {
        match self {
            Self::PayloadError(_) => (StatusCode::BAD_REQUEST, "Payload error"),
            Self::Conflict(_) => (StatusCode::CONFLICT, "Resource conflict."),
            Self::NotFound => (StatusCode::NOT_FOUND, "We couldn't find that."),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Invalid credentials."),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "An internal error occurred.",
            ),
        }
    }
}

impl From<DatabaseError> for AppError {
    fn from(value: DatabaseError) -> Self {
        match value {
            DatabaseError::NotFound => Self::NotFound,
            DatabaseError::BadRequest(msg) => Self::PayloadError(msg),
            DatabaseError::Conflict(msg) => Self::Conflict(msg),
            other => Self::Database(other),
        }
    }
}
