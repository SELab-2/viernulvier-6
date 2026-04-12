//! Per-entity DB insert logic extracted from `ApiImporter`.
//!
//! each function takes a `&Database` plus one already-parsed `Api*` struct and performs the FK lookups + insert
//! Shared between the live importer (HTTP-driven) and the offline seed binary

pub mod event_prices;
pub mod events;
pub mod halls;
pub mod locations;
pub mod price_ranks;
pub mod prices;
pub mod productions;
pub mod spaces;
