use ormlite::Model;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Model, PartialEq)]
#[ormlite(insert = "HallCreate")]
#[ormlite(table = "halls")]
pub struct Hall {
    pub id: Uuid,

    pub source_id: Option<i32>,
    pub slug: String,

    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub seat_selection: Option<bool>,
    pub open_seating: Option<bool>,
    pub name: String,
    pub remark: Option<String>,

    // references
    pub space_id: Option<Uuid>, // foreign key of the associated space
}

pub struct HallSearch {
    pub q: Option<String>,
}

#[derive(Debug, PartialEq, FromRow)]
pub struct HallWithScore {
    #[sqlx(flatten)]
    pub hall: Hall,
    pub distance_score: f32,
}
