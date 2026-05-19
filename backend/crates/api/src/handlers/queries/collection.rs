use db::models::collection::{CollectionSearch, CollectionVisibility};
use o2o::o2o;
use serde::Deserialize;
use utoipa::IntoParams;

#[derive(o2o, Deserialize, IntoParams)]
#[owned_into(CollectionSearch)]
pub struct CollectionSearchQuery {
    pub q: Option<String>,
    pub visibility: Option<CollectionVisibility>,
}

#[derive(Deserialize, IntoParams)]
pub struct CollectionVisibilityQuery {
    pub visibility: Option<CollectionVisibility>,
}
