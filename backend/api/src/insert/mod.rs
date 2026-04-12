//! each submodule provides an inherent `insert` method on its `Api*` struct
//! that performs the FK lookups + insert. Shared between the live importer

pub mod event_prices;
pub mod events;
pub mod halls;
pub mod locations;
pub mod price_ranks;
pub mod prices;
pub mod productions;
pub mod spaces;
