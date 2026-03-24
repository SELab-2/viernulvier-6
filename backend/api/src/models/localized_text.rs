use serde::{Deserialize, Deserializer};
use serde_json::Value;

#[derive(Debug)]
pub struct ApiLocalizedText {
    pub en: Option<String>,
    pub fr: Option<String>,
    pub nl: Option<String>,
}

impl<'de> Deserialize<'de> for ApiLocalizedText {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        // We use serde_json::Value to handle edge cases like `[]` or `null` gracefully
        let value = Option::<Value>::deserialize(deserializer)?;

        let value = match value {
            Some(v) => v,
            None => {
                return Ok(ApiLocalizedText {
                    en: None,
                    fr: None,
                    nl: None,
                });
            }
        };

        if value.is_array() || value.is_null() {
            return Ok(ApiLocalizedText {
                en: None,
                fr: None,
                nl: None,
            });
        }

        if let Some(obj) = value.as_object() {
            let en = obj.get("en").and_then(|v| v.as_str()).map(String::from);
            let fr = obj.get("fr").and_then(|v| v.as_str()).map(String::from);
            let nl = obj.get("nl").and_then(|v| v.as_str()).map(String::from);

            Ok(ApiLocalizedText { en, fr, nl })
        } else {
            // Unrecognized shape (e.g. a plain string), default to empty
            Ok(ApiLocalizedText {
                en: None,
                fr: None,
                nl: None,
            })
        }
    }
}
