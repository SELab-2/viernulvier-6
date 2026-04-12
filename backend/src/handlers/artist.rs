use database::Database;

use crate::{
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
pub async fn get_all(db: Database) -> JsonResponse<Vec<ArtistPayload>> {
    ArtistPayload::all(&db).await?.json()
}
