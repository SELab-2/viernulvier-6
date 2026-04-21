pub mod article;
pub mod artist;
pub mod collection;
pub mod event;
pub mod event_price;
pub mod facet;
pub mod hall;
pub mod import_error;
pub mod location;
pub mod media;
pub mod paginated;
pub mod production;
pub mod series;
pub mod space;
pub mod stats;

/// Build a full public URL for an S3 object key given a base URL.
/// Trims any trailing slash from the base to avoid double slashes.
pub(crate) fn build_cover_url(base: &str, s3_key: &str) -> String {
    format!("{}/{}", base.trim_end_matches('/'), s3_key)
}
