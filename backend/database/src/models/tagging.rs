use ormlite::Model;
use uuid::Uuid;

use crate::models::entity_type::EntityType;

#[derive(Debug, Model)]
#[ormlite(insert = "TaggingCreate")]
#[ormlite(table = "taggings")]
pub struct Tagging {
    pub id: Uuid,
    pub tag_id: Uuid,
    pub entity_type: EntityType,
    pub entity_id: Uuid,
    pub inherited: bool,
}
