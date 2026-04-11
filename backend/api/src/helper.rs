use tracing::warn;

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
pub fn extract_source_id(hyperlink: &str) -> Option<i32> {
    let id: Option<i32> = hyperlink
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .and_then(|s| s.parse().ok());
    if id.is_none() {
        warn!("Failed to extract source_id from url: {}", hyperlink);
    }
    id
}

/// Helper to parse the 'amount' string inside a price to an integer representing the amount of
/// cents. Prices are stored as integer cents to avoid floating-point precision and rounding
/// issues when working with monetary values.
pub fn parse_amount_cents(amount: &str) -> Option<i32> {
    let (whole, fractional) = amount.split_once('.')?;
    if fractional.len() != 2
        || !whole.bytes().all(|b| b.is_ascii_digit() || b == b'-')
        || !fractional.bytes().all(|b| b.is_ascii_digit())
    {
        warn!("Failed to parse amount as cents: {}", amount);
        return None;
    }

    let whole = whole.parse::<i32>().ok()?;
    let fractional = fractional.parse::<i32>().ok()?;

    whole.checked_mul(100).and_then(|value| {
        if whole < 0 {
            value.checked_sub(fractional)
        } else {
            value.checked_add(fractional)
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_source_id_valid_inputs() {
        assert_eq!(extract_source_id("/api/v1/spaces/27"), Some(27));
        assert_eq!(extract_source_id("/api/v1/spaces/1"), Some(1));
        assert_eq!(extract_source_id("/api/v1/spaces/27/"), Some(27)); // trailing slash
    }

    #[test]
    fn test_extract_source_id_invalid_inputs() {
        assert_eq!(extract_source_id("/api/v1/spaces/abc"), None);
        assert_eq!(extract_source_id("/api/v1/spaces/"), None);
        assert_eq!(extract_source_id(""), None);
        assert_eq!(extract_source_id("/"), None);
    }

    #[test]
    fn test_parse_amount_cents_valid_inputs() {
        assert_eq!(parse_amount_cents("0.00"), Some(0));
        assert_eq!(parse_amount_cents("10.00"), Some(1000));
        assert_eq!(parse_amount_cents("10.50"), Some(1050));
        assert_eq!(parse_amount_cents("10.75"), Some(1075));
        assert_eq!(parse_amount_cents("-1.25"), Some(-125));
    }

    #[test]
    fn test_parse_amount_cents_invalid_inputs() {
        assert_eq!(parse_amount_cents("10"), None);
        assert_eq!(parse_amount_cents("10.5"), None);
        assert_eq!(parse_amount_cents("10.500"), None);
        assert_eq!(parse_amount_cents("abc"), None);
    }
}
