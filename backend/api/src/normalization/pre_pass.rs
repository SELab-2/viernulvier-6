use uuid::Uuid;

/// Strips tags and collapses whitespace.
pub fn strip_html(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let fragment = scraper::Html::parse_fragment(input);
    let text = fragment
        .root_element()
        .text()
        .collect::<Vec<_>>()
        .join(" ");
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[derive(Debug, Clone, PartialEq)]
pub struct SlugLookup {
    pub id: Uuid,
    pub slug: String,
}

/// Case-insensitive exact slug match. 404 data is occasionally mixed-case.
pub fn exact_slug_match<'a>(candidate: &str, existing: &'a [SlugLookup]) -> Option<&'a Uuid> {
    let needle = candidate.trim();
    if needle.is_empty() {
        return None;
    }
    existing
        .iter()
        .find(|lookup| lookup.slug.eq_ignore_ascii_case(needle))
        .map(|lookup| &lookup.id)
}

/// Split a multi-artist field on `,`, `&`, ` en `, ` and `, ` / `.
pub fn split_artist_field(raw: &str) -> Vec<String> {
    const SEPARATORS: &[&str] = &[",", "&", " en ", " and ", " / "];
    let mut pieces: Vec<String> = vec![raw.to_string()];
    for sep in SEPARATORS {
        pieces = pieces
            .into_iter()
            .flat_map(|piece| piece.split(sep).map(str::to_string).collect::<Vec<_>>())
            .collect();
    }
    pieces
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_html_removes_tags() {
        assert_eq!(
            strip_html("<p>Hello <strong>world</strong>!</p>"),
            "Hello world!"
        );
    }

    #[test]
    fn strip_html_collapses_whitespace() {
        assert_eq!(
            strip_html("<p>Line 1</p>\n<p>   Line 2   </p>"),
            "Line 1 Line 2"
        );
    }

    #[test]
    fn strip_html_handles_empty() {
        assert_eq!(strip_html(""), "");
    }

    #[test]
    fn strip_html_plain_text_unchanged() {
        assert_eq!(strip_html("Just a sentence."), "Just a sentence.");
    }

    #[test]
    fn split_artist_field_handles_separators() {
        assert_eq!(
            split_artist_field("Jan Decleir & Wim Opbrouck, Tom Smith en Els Dottermans"),
            vec!["Jan Decleir", "Wim Opbrouck", "Tom Smith", "Els Dottermans"]
        );
    }

    #[test]
    fn split_artist_field_single_name() {
        assert_eq!(split_artist_field("Solo Artist"), vec!["Solo Artist"]);
    }

    #[test]
    fn split_artist_field_trims_and_drops_empty() {
        assert_eq!(
            split_artist_field(",  Alice ,  , Bob,"),
            vec!["Alice", "Bob"]
        );
    }

    #[test]
    fn exact_slug_match_hits_and_misses() {
        let id_a = Uuid::parse_str("00000000-0000-0000-0000-00000000000a").unwrap();
        let id_b = Uuid::parse_str("00000000-0000-0000-0000-00000000000b").unwrap();
        let lookup = vec![
            SlugLookup {
                id: id_a,
                slug: "jazz-festival".to_string(),
            },
            SlugLookup {
                id: id_b,
                slug: "theater".to_string(),
            },
        ];

        assert_eq!(exact_slug_match("jazz-festival", &lookup), Some(&id_a));
        assert_eq!(exact_slug_match("Theater", &lookup), Some(&id_b));
        assert_eq!(exact_slug_match("  theater  ", &lookup), Some(&id_b));
        assert_eq!(exact_slug_match("dance", &lookup), None);
        assert_eq!(exact_slug_match("", &lookup), None);
    }
}
