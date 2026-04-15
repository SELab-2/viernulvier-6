use database::models::{entity_type::EntityType, media::MediaSearch};
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

use crate::handlers::queries::sort::Sort;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(MediaSearch)]
pub struct MediaSearchQuery {
    pub q: Option<String>,
    #[param(value_type = EntityType, inline, required = false)]
    pub entity_type: Option<EntityType>,
    pub entity_id: Option<uuid::Uuid>,
    #[param(value_type = String, required = false)]
    pub role: Option<String>,

    #[owned_into(~.map(Into::into))]
    #[param(value_type = Sort, inline, required = false)]
    pub sort: Option<Sort>,
}
