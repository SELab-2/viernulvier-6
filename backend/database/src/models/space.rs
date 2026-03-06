use ormlite::Model;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "SpaceCreate")]
#[ormlite(table = "spaces")]
pub struct Space {
    pub id: Uuid,

    pub source_id: Option<i32>,
    
    pub name_nl: String,
    
    // references
    pub location_id: Uuid, // Foreign Key
}

