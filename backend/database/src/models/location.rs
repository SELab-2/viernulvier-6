use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, PartialEq)]
pub struct LocationBase {
    pub name: Option<String>, // not currently present in their API, but sometimes present in the CSV
    pub code: Option<String>,
    pub street: Option<String>,
    pub number: Option<String>,
    pub postal_code: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone_1: Option<String>,
    pub phone_2: Option<String>,
    pub is_owned_by_viernulvier: Option<bool>,
    pub uitdatabank_id: Option<String>,
}

#[derive(Debug, FromRow, PartialEq)]
pub struct Location {
    pub id: Uuid,
    #[sqlx(flatten)]
    pub base: LocationBase,
}

#[derive(Debug)]
pub struct LocationCreate {
    pub source_id: Option<i32>,
    pub slug: String,
    pub base: LocationBase,
}

