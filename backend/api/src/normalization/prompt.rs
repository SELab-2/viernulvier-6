use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
        }
    }
}

pub fn base_system_prompt() -> &'static str {
    "You normalize messy cultural-archive data. Return exactly one JSON object \
     that matches the schema described in the user message. Do not wrap the \
     JSON in markdown fences. Do not include explanatory prose. Include a \
     `confidence` field between 0.0 and 1.0 for every action."
}
