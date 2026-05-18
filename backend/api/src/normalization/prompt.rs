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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_message_system_constructor() {
        let msg = ChatMessage::system("hello");
        assert_eq!(msg.role, Role::System);
        assert_eq!(msg.content, "hello");
    }

    #[test]
    fn chat_message_user_constructor() {
        let msg = ChatMessage::user("query");
        assert_eq!(msg.role, Role::User);
        assert_eq!(msg.content, "query");
    }

    #[test]
    fn role_serde_lowercase() {
        let json = serde_json::to_string(&Role::Assistant).unwrap();
        assert_eq!(json, "\"assistant\"");
        let parsed: Role = serde_json::from_str("\"system\"").unwrap();
        assert_eq!(parsed, Role::System);
    }

    #[test]
    fn base_system_prompt_contains_confidence() {
        let prompt = base_system_prompt();
        assert!(prompt.contains("confidence"));
        assert!(prompt.contains("0.0"));
    }
}
