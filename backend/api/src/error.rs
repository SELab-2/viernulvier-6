use thiserror::Error;

#[derive(Debug, Error)]
pub enum ImporterError {
    #[error("Reqwest error: {0}")]
    Reqwest(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("S3 error: {0}")]
    S3(String),
}
