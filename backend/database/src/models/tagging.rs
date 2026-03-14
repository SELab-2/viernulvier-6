use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model)]
#[ormlite(insert = "TaggingCreate")]
#[ormlite(table = "taggings")]
pub struct Tagging {
    pub id: Uuid,
    pub tag_id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub inherited: bool,
}
