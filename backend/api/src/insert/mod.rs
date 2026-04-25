//! Each submodule provides importer-specific inherent methods on its `Api*`
//! struct. The live importer keeps orchestration in `lib.rs` while the
//! entity-specific upsert and FK resolution logic lives here.

pub mod event_prices;
pub mod events;
pub mod halls;
pub mod locations;
pub mod price_ranks;
pub mod prices;
pub mod productions;
pub mod spaces;
