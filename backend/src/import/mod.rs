pub mod adapters;
pub mod registry;
pub mod trait_def;
pub mod types;

pub use registry::ImportRegistry;
pub use trait_def::ImportableEntity;
pub use types::*;

pub fn default_registry() -> registry::ImportRegistry {
    use std::sync::Arc;
    registry::ImportRegistry::new(vec![
        Arc::new(adapters::production::ProductionImport) as Arc<dyn trait_def::ImportableEntity>,
        Arc::new(adapters::event::EventImport),
        Arc::new(adapters::stub::StubAdapter::new("article")),
        Arc::new(adapters::stub::StubAdapter::new("location")),
        Arc::new(adapters::stub::StubAdapter::new("artist")),
    ])
}
