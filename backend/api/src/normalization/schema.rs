use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct NormalizationResponse {
    #[serde(default)]
    pub artists: Vec<ArtistAction>,
    #[serde(default)]
    pub genre_classifications: Vec<GenreAction>,
    #[serde(default)]
    pub location_name: Option<LocationAction>,
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
#[serde(tag = "match", rename_all = "snake_case")]
pub enum ArtistAction {
    Existing {
        id: Uuid,
        confidence: f32,
    },
    New {
        name: String,
        slug: String,
        confidence: f32,
    },
}

impl ArtistAction {
    pub fn confidence(&self) -> f32 {
        match self {
            Self::Existing { confidence, .. } | Self::New { confidence, .. } => *confidence,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
#[serde(tag = "maps_to", rename_all = "snake_case")]
pub enum GenreAction {
    Tag {
        genre_id: String,
        facet: String,
        tag_name: String,
        confidence: f32,
    },
    Series {
        genre_id: String,
        series_name: String,
        confidence: f32,
    },
    Discard {
        genre_id: String,
        reason: String,
        confidence: f32,
    },
}

impl GenreAction {
    pub fn confidence(&self) -> f32 {
        match self {
            Self::Tag { confidence, .. }
            | Self::Series { confidence, .. }
            | Self::Discard { confidence, .. } => *confidence,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub struct LocationAction {
    pub derived_name: String,
    pub confidence: f32,
}

pub fn passes_threshold(confidence: f32, threshold: f32) -> bool {
    confidence >= threshold
}

pub fn parse_response(raw: &str) -> NormalizationResponse {
    match serde_json::from_str::<NormalizationResponse>(raw) {
        Ok(resp) => resp,
        Err(err) => {
            tracing::warn!(
                error = %err,
                snippet = %raw.chars().take(200).collect::<String>(),
                "failed to parse normalization response; skipping"
            );
            NormalizationResponse::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_full_response_round_trip() {
        let raw = r#"{
            "artists": [
                {"match": "existing", "id": "00000000-0000-0000-0000-000000000001", "confidence": 0.95},
                {"match": "new", "name": "Tom Smith", "slug": "tom-smith", "confidence": 0.82}
            ],
            "genre_classifications": [
                {"maps_to": "tag", "genre_id": "g1", "facet": "discipline", "tag_name": "theater", "confidence": 0.97},
                {"maps_to": "series", "genre_id": "g2", "series_name": "Jazz Festival 2025", "confidence": 0.9},
                {"maps_to": "discard", "genre_id": "g3", "reason": "not relevant", "confidence": 0.6}
            ],
            "location_name": {"derived_name": "Theaterzaal Vooruit", "confidence": 0.88}
        }"#;

        let resp = parse_response(raw);
        assert_eq!(resp.artists.len(), 2);
        assert_eq!(resp.genre_classifications.len(), 3);
        assert!(resp.location_name.is_some());
    }

    #[test]
    fn missing_fields_default_to_empty() {
        let raw = "{}";
        let resp = parse_response(raw);
        assert!(resp.artists.is_empty());
        assert!(resp.genre_classifications.is_empty());
        assert!(resp.location_name.is_none());
    }

    #[test]
    fn malformed_json_returns_empty() {
        let resp = parse_response("this is not json");
        assert_eq!(resp, NormalizationResponse::default());
    }

    #[test]
    fn unknown_action_variant_fails_gracefully() {
        let raw = r#"{"artists": [{"match": "weird", "name": "x", "confidence": 0.5}]}"#;
        let resp = parse_response(raw);
        assert!(resp.artists.is_empty());
    }

    #[test]
    fn threshold_filter() {
        assert!(passes_threshold(0.9, 0.8));
        assert!(passes_threshold(0.8, 0.8));
        assert!(!passes_threshold(0.79, 0.8));
    }
}
