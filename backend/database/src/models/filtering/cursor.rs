use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct CursorData {
    pub id: Uuid,
    pub score: Option<f32>,
}
