use axum::extract::Path;
use database::Database;
use uuid::Uuid;

use crate::{
    dto::{artist::ArtistPayload, production::ProductionPayload},
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

#[utoipa::path(
    method(get),
    path = "/artists/{id}",
    tag = "Artists",
    operation_id = "get_one_artist",
    description = "Get an artist by id",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 200, description = "Success", body = ArtistPayload),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_one(db: Database, Path(id): Path<Uuid>) -> JsonResponse<ArtistPayload> {
    ArtistPayload::by_id(&db, id).await?.json()
}

#[utoipa::path(
    method(get),
    path = "/artists/{id}/productions",
    tag = "Artists",
    operation_id = "get_productions_by_artist_id",
    description = "Get all productions for an artist",
    params(
        ("id" = Uuid, Path, description = "Artist UUID")
    ),
    responses(
        (status = 200, description = "Success", body = [ProductionPayload]),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_productions(
    db: Database,
    Path(id): Path<Uuid>,
) -> JsonResponse<Vec<ProductionPayload>> {
    ArtistPayload::productions(&db, id).await?.json()
}
