use axum::{
    Json,
    body::Body,
    http::{Method, Request, header},
    response::{IntoResponse, Response},
};
use database::{Database, models::user::UserRole};
use dotenvy::dotenv;
use serde::Serialize;
use sqlx::PgPool;
use tower::ServiceExt;
use viernulvier_api::{AppState, config::AppConfig, router};

use crate::common::user::{create_test_user, login_user};

pub struct TestRouter {
    router: axum::Router,
    db: PgPool,
    cookie: Option<String>,
}

impl TestRouter {
    pub fn new(db: PgPool) -> Self {
        let _ = dotenv();

        let config = AppConfig::load().unwrap();

        let state = AppState {
            db: Database::new(db.clone()),
            config,
        };

        Self {
            router: router(state.clone()).with_state(state),
            db,
            cookie: None,
        }
    }

    pub async fn login(mut self, email: &str, role: UserRole) -> Self {
        let database = Database::new(self.db.clone());
        let config = AppConfig::load().unwrap();
        let user = create_test_user(&database, email, role).await;
        let cookie = login_user(&database, &config, &user).await;
        self.cookie = Some(cookie);
        self
    }

    pub async fn as_editor(db: PgPool) -> Self {
        Self::new(db).login("editor@test.com", UserRole::Editor).await
    }

    pub async fn as_admin(db: PgPool) -> Self {
        Self::new(db).login("admin@test.com", UserRole::Admin).await
    }

    pub async fn as_user(db: PgPool) -> Self {
        Self::new(db).login("user@test.com", UserRole::User).await
    }

    /// send a request to an endpoint on this router
    ///
    /// must have a leading "/"
    pub async fn get(&self, path: &str) -> Response<Body> {
        self.request(Method::GET, path, None::<()>).await
    }

    /// send a patch request to an endpoint on this router
    ///
    /// must have a leading "/"
    pub async fn patch<T: Serialize>(&self, path: &str, body: T) -> Response<Body> {
        self.request(Method::PATCH, path, Some(body)).await
    }

    /// send a post request to an endpoint on this router
    ///
    /// must have a leading "/"
    pub async fn post<T: Serialize>(&self, path: &str, body: T) -> Response<Body> {
        self.request(Method::POST, path, Some(body)).await
    }

    /// send a put request to an endpoint on this router
    ///
    /// must have a leading "/"
    pub async fn put<T: Serialize>(&self, path: &str, body: T) -> Response<Body> {
        self.request(Method::PUT, path, Some(body)).await
    }

    /// send a delete request to an endpoint on this router
    ///
    /// must have a leading "/"
    pub async fn delete(&self, path: &str) -> Response<Body> {
        self.request(Method::DELETE, path, None::<()>).await
    }

    /// send a request to an endpoint on this router
    ///
    /// must have a leading "/"
    async fn request<T: Serialize>(
        &self,
        method: Method,
        path: &str,
        body: Option<T>,
    ) -> Response<Body> {
        let path = path.trim_start_matches('/');
        let uri = format!("/api/{path}");
        let mut request_builder = Request::builder().method(method).uri(uri);

        if let Some(cookie) = &self.cookie {
            request_builder = request_builder.header(header::COOKIE, cookie);
        }

        let request = match body {
            Some(body) => request_builder
                .header(header::CONTENT_TYPE, mime::APPLICATION_JSON.as_ref())
                .body(Json(body).into_response().into_body()),
            None => request_builder.body(Body::empty()),
        };

        self.router.clone().oneshot(request.unwrap()).await.unwrap()
    }
}
