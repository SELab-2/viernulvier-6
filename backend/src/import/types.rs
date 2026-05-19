use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum FieldType {
    String,
    Text,
    Integer,
    Decimal,
    Boolean,
    Date,
    DateTime,
    ForeignKey { target: String, match_field: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FieldSpec {
    pub name: String,
    pub label: String,
    pub field_type: FieldType,
    pub required: bool,
    pub unique_lookup: bool,
}

pub type RawRow = BTreeMap<String, Option<String>>;
pub type ResolvedRow = BTreeMap<String, serde_json::Value>;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ReferenceSuggestion {
    pub id: Uuid,
    pub label: String,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Default)]
pub struct ReferenceResolution {
    /// column -> suggestions (top N, best first)
    pub per_column: BTreeMap<String, Vec<ReferenceSuggestion>>,
}
