use crate::models::localized_text::ApiLocalizedText;

/// Helper to split ApiLocalizedText into a tuple of (nl, en)
pub fn flatten_loc(text: Option<ApiLocalizedText>) -> (Option<String>, Option<String>) {
    match text {
        Some(t) => (t.nl, t.en),
        None => (None, None),
    }
}

/// Helper for fields that are localized in the API but single strings in the DB.
/// This prioritizes 'nl', falling back to 'en' if 'nl' is missing.
pub fn flatten_single(text: Option<ApiLocalizedText>) -> Option<String> {
    text.and_then(|t| t.nl.or(t.en))
}
