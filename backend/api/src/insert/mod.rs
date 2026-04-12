//! Per-entity DB insert logic extracted from `ApiImporter`.
//!
//! Each function takes a `&Database` plus one already-parsed `Api*` struct and
//! performs the FK lookups + insert the live importer used to do inline.
//! Shared between the live importer (HTTP-driven) and the offline seed binary
//! (disk-driven). No HTTP, no S3.

pub mod event_prices;
pub mod events;
pub mod halls;
pub mod locations;
pub mod price_ranks;
pub mod prices;
pub mod productions;
pub mod spaces;
