use axum::{
    body::{Body, to_bytes},
    response::Response,
};
use serde::de::DeserializeOwned;

pub trait IntoStruct {
    async fn into_struct<T>(self) -> T
    where
        T: DeserializeOwned + Send;
}

impl IntoStruct for Response<Body> {
    async fn into_struct<T>(self) -> T
    where
        T: DeserializeOwned + Send,
    {
        let body = self.into_body();

        let bytes = to_bytes(body, usize::MAX)
            .await
            .expect("failed to read response body");

        serde_json::from_slice(&bytes).expect("response should be valid json")
    }
}
