use axum::extract::State;
use database::Database;

use crate::{
    AppState,
    dto::artist::ArtistPayload,
    handlers::{IntoApiResponse, JsonResponse},
};

#[utoipa::path(
    method(get),
    path = "/artists",
    tag = "Artists",
    operation_id = "get_all_artists",
    description = "Get all artists",
    responses(
        (status = 200, description = "Success", body = [ArtistPayload])
    )
)]
pub async fn get_all(
    State(state): State<AppState>,
    db: Database,
) -> JsonResponse<Vec<ArtistPayload>> {
    let public_url = state.config.s3.as_ref().map(|s| s.public_url.as_str());
    ArtistPayload::all(&db, public_url).await?.json()
}
