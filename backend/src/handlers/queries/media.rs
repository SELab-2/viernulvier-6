use database::models::{entity_type::EntityType, media::MediaSearch};
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::sort::Sort;

#[derive(Deserialize, IntoParams)]
pub struct MediaSearchQuery {
    pub q: Option<String>,
    #[param(value_type = EntityType, inline, required = false)]
    pub entity_type: Option<EntityType>,
    pub entity_id: Option<uuid::Uuid>,
    #[param(value_type = String, required = false)]
    pub role: Option<String>,

    #[param(value_type = Sort, inline, required = false)]
    pub sort: Option<Sort>,
}

impl From<MediaSearchQuery> for MediaSearch {
    fn from(value: MediaSearchQuery) -> Self {
        Self {
            q: value.q,
            entity_type: value.entity_type,
            entity_id: value.entity_id,
            role: value.role,
            sort: value.sort.unwrap_or_default().into(),
        }
    }
}
