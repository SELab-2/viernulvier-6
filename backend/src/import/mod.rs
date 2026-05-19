pub mod adapters;
pub mod csv_parser;
pub mod registry;
pub mod storage;
pub mod trait_def;
pub mod types;
pub mod worker;

pub use registry::ImportRegistry;
pub use trait_def::ImportableEntity;
pub use types::*;

pub fn default_registry() -> registry::ImportRegistry {
    use std::sync::Arc;
    registry::ImportRegistry::new(vec![
        Arc::new(adapters::production::ProductionImport) as Arc<dyn trait_def::ImportableEntity>,
        Arc::new(adapters::event::EventImport),
        Arc::new(adapters::artist::ArtistImport),
        Arc::new(adapters::location::LocationImport),
        Arc::new(adapters::article::ArticleImport),
        Arc::new(adapters::stub::StubAdapter::new("media")),
        Arc::new(adapters::stub::StubAdapter::new("series")),
        Arc::new(adapters::stub::StubAdapter::new("collection")),
    ])
}
