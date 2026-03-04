use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct HallBase {
    pub vendor_id: Option<String>,
    pub box_office_id: Option<String>,
    pub seat_selection: Option<bool>,
    pub open_seating: Option<bool>,
    pub name: String,
    pub remark: Option<String>,
}

#[derive(Debug, FromRow, PartialEq)]
pub struct Hall {
    pub id: Uuid,
    #[sqlx(Flatten)]
    pub base: HallBase,
}

#[derive(Debug)]
pub struct HallCreate {
    pub source_id: Option<String>,
    pub slug: String,
    pub base: HallBase,
}

