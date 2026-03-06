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

/// Helper to extract the id out of a hyperlink that has the format
/// "https://www.viernulvier.gent/api/v1/spaces/1". The last int gets extracted.
pub fn extract_source_id(hyperlink: &str) -> i32 {
    hyperlink
        .rsplit('/')
        .next()
        .unwrap()
        .parse()
        .unwrap()
}

