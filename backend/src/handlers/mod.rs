use axum::{Json, http::StatusCode};
use serde::Serialize;

use crate::error::AppError;

pub mod admin;
pub mod article;
pub mod artist;
pub mod auth;
pub mod collection;
pub mod event;
pub mod hall;
pub mod location;
pub mod media;
pub mod production;
pub mod series;
pub mod space;
pub mod taxonomy;
pub mod version;
pub mod queries {
    pub mod pagination;
    pub mod production;
    pub mod sort;
}

pub type JsonResponse<T> = Result<Json<T>, AppError>;
pub type JsonStatusResponse<T> = Result<(StatusCode, Json<T>), AppError>;
pub type StatusResponse = Result<StatusCode, AppError>;

pub trait IntoApiResponse: Sized {
    fn json_created(self) -> JsonStatusResponse<Self>;
    fn json(self) -> JsonResponse<Self>;
}

impl<T: Serialize> IntoApiResponse for T {
    fn json_created(self) -> JsonStatusResponse<Self> {
        Ok((StatusCode::CREATED, Json(self)))
    }

    fn json(self) -> JsonResponse<Self> {
        Ok(Json(self))
    }
}
