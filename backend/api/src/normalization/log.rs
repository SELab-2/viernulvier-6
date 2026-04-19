use database::{Database, models::normalization_log::NormalizationLogCreate};

/// Log writes must never break the importer, so DB errors are only warned.
pub async fn record(db: &Database, entry: NormalizationLogCreate) {
    if let Err(err) = db.normalization_log().insert(entry).await {
        tracing::warn!(error = %err, "failed to write normalization_log row");
    }
}
