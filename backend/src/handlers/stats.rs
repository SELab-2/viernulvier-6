use database::Database;

use crate::{
    dto::stats::StatsPayload,
    handlers::{IntoApiResponse, JsonCachedResponse},
};

#[utoipa::path(
    method(get),
    path = "/stats",
    tag = "Stats",
    operation_id = "get_stats",
    description = "Aggregate public site statistics (cached)",
    responses(
        (status = 200, description = "Success", body = StatsPayload,
            headers(
                ("Cache-Control" = String,
                    description = "Public cache: max-age=3600 (1h), stale-while-revalidate=86400 (24h)")
            )
        )
    )
)]
pub async fn get(db: Database) -> JsonCachedResponse<StatsPayload> {
    StatsPayload::collect(&db).await?.json_public_cached()
}
