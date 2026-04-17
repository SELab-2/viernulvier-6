use axum::{
    Json,
    http::{HeaderMap, HeaderValue, StatusCode, header::CACHE_CONTROL},
};
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
pub mod stats;
pub mod tagging;
pub mod taxonomy;
pub mod version;
pub mod queries {
    pub mod hall;
    pub mod location;
    pub mod article;
    pub mod pagination;
    pub mod production;
    pub mod sort;
    pub mod split_strip;
}

/// Default `Cache-Control` for publicly cacheable JSON responses (`/stats`, etc.).
const PUBLIC_CACHE_HEADER: &str = "public, max-age=3600, stale-while-revalidate=86400";

pub type JsonResponse<T> = Result<Json<T>, AppError>;
pub type JsonStatusResponse<T> = Result<(StatusCode, Json<T>), AppError>;
pub type JsonCachedResponse<T> = Result<(HeaderMap, Json<T>), AppError>;
pub type StatusResponse = Result<StatusCode, AppError>;

pub trait IntoApiResponse: Sized {
    fn json_created(self) -> JsonStatusResponse<Self>;
    fn json(self) -> JsonResponse<Self>;
    fn json_public_cached(self) -> JsonCachedResponse<Self>;
}

impl<T: Serialize> IntoApiResponse for T {
    fn json_created(self) -> JsonStatusResponse<Self> {
        Ok((StatusCode::CREATED, Json(self)))
    }

    fn json(self) -> JsonResponse<Self> {
        Ok(Json(self))
    }

    fn json_public_cached(self) -> JsonCachedResponse<Self> {
        let mut headers = HeaderMap::new();
        headers.insert(CACHE_CONTROL, HeaderValue::from_static(PUBLIC_CACHE_HEADER));
        Ok((headers, Json(self)))
    }
}
