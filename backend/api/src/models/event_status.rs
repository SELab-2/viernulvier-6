use serde::Deserialize;

use crate::models::localized_text::ApiLocalizedText;

#[derive(Debug, Deserialize)]
pub struct ApiEventStatus {
    #[serde(rename = "@id")]
    pub id: String,
    pub short_name: String,
    pub name: ApiLocalizedText,
}

impl ApiEventStatus {
    pub fn display(&self) -> String {
        if !self.short_name.is_empty() {
            self.short_name.clone()
        } else {
            self.name.nl.clone().unwrap_or_default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_prefers_short_name() {
        let json = r#"{
            "@id": "/api/v1/events/statuses/1",
            "short_name": "normaal",
            "name": { "nl": "normaal" }
        }"#;
        let s: ApiEventStatus = serde_json::from_str(json).unwrap();
        assert_eq!(s.display(), "normaal");
    }

    #[test]
    fn display_falls_back_to_name_nl_when_short_name_empty() {
        let json = r#"{
            "@id": "/api/v1/events/statuses/12",
            "short_name": "",
            "name": { "nl": "gratis", "en": "free" }
        }"#;
        let s: ApiEventStatus = serde_json::from_str(json).unwrap();
        assert_eq!(s.display(), "gratis");
    }

    #[test]
    fn display_empty_when_both_missing() {
        let json = r#"{
            "@id": "/api/v1/events/statuses/99",
            "short_name": "",
            "name": {}
        }"#;
        let s: ApiEventStatus = serde_json::from_str(json).unwrap();
        assert_eq!(s.display(), "");
    }
}
