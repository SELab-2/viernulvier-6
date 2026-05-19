use chrono::{DateTime, Utc};
use ormlite::Model;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Model)]
#[ormlite(table = "sessions", insert = "SessionCreate")]
pub struct Session {
    #[ormlite(primary_key)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    #[ormlite(default)]
    pub created_at: DateTime<Utc>,
}
