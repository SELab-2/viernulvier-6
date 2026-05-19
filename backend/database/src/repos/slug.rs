pub(crate) fn escape_like_pattern(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());

    for ch in value.chars() {
        if matches!(ch, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(ch);
    }

    escaped
}

pub(crate) fn next_unique_slug<'a>(
    base_slug: &str,
    existing_slugs: impl IntoIterator<Item = &'a str>,
) -> String {
    let mut base_taken = false;
    let mut highest_suffix = 1u64;
    let prefix = format!("{base_slug}-");

    for slug in existing_slugs {
        if slug == base_slug {
            base_taken = true;
            continue;
        }

        let Some(suffix) = slug.strip_prefix(&prefix) else {
            continue;
        };

        if suffix.is_empty() || !suffix.chars().all(|ch| ch.is_ascii_digit()) {
            continue;
        }

        if let Ok(number) = suffix.parse::<u64>() {
            highest_suffix = highest_suffix.max(number);
        }
    }

    if base_taken {
        format!("{base_slug}-{}", highest_suffix + 1)
    } else {
        base_slug.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::{escape_like_pattern, next_unique_slug};

    #[test]
    fn escapes_like_wildcards() {
        assert_eq!(escape_like_pattern(r"a%b_c\d"), r"a\%b\_c\\d");
    }

    #[test]
    fn returns_base_slug_when_not_taken() {
        let existing = ["concert-2"];

        assert_eq!(next_unique_slug("concert", existing), "concert");
    }

    #[test]
    fn increments_highest_numeric_suffix() {
        let existing = ["concert", "concert-2", "concert-7", "concert-extra"];

        assert_eq!(next_unique_slug("concert", existing), "concert-8");
    }
}
