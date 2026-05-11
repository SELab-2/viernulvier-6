use serde::Deserialize;
use utoipa::IntoParams;

#[derive(Deserialize, IntoParams)]
pub struct ArtistSearchQuery {
    pub q: Option<String>,
}
