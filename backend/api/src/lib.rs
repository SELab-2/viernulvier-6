use std::pin::pin;

use chrono::Utc;
use database::{Database, models::internal_state::InternalStateKey};
use futures::{Stream, StreamExt, stream};
use reqwest::Client;
use serde::de::DeserializeOwned;
use tracing::{info, warn};

use crate::helper::extract_source_id;
use crate::models::space::ApiSpace;
use crate::models::{
    collection::ApiCollection, event::ApiEvent, hall::ApiHall, location::ApiLocation,
    production::ApiProduction,
};

mod helper;
pub mod models {
    pub mod collection;
    pub mod event;
    pub mod genre;
    pub mod hall;
    pub mod localized_text;
    pub mod location;
    pub mod media;
    pub mod production;
    pub mod space;
}

const API_BASE_URL: &str = "https://www.viernulvier.gent/api/v1";

pub struct ApiImporter {
    db: Database,
    auth_token: String,
    client: Client,
}

impl ApiImporter {
    pub fn new(db: Database, auth_token: String) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("selab6")
            .build()
            .unwrap();

        Self {
            db,
            auth_token,
            client,
        }
    }

    /// get the last time we updated from the external api
    ///
    /// defaults to a timestamp old enough to update all
    async fn get_last_updated(&self) -> String {
        self.db
            .internal()
            .get_value(InternalStateKey::LastApiUpdate)
            .await
            .unwrap_or_else(|e| {
                warn!("error when fetching last api update timestamp: {e}. updating all.");
                "2000-01-01T00:00:00Z".into()
            })
    }

    /// saves the last updated time
    async fn set_last_updated(&self, timestamp: String) {
        let _ = self // ignore the result, if not saved, we import again later
            .db
            .internal()
            .set_value(InternalStateKey::LastApiUpdate, &timestamp)
            .await;
    }

    /// updates all objects from the external api since we last updated
    pub async fn update_since_last(&self) -> Result<(), reqwest::Error> {
        // save the current timestamp now, to insure we don't lose any updated items
        // this can happen when updates are made while we are importing, as it takes quite long
        let current_ts = Utc::now().to_rfc3339();
        let last_update_ts = self.get_last_updated().await;

        // TODO start transactions
        // order : locations -> spaces -> halls
        // a location contains a space, which in turn contains one or more hall
        let res = async {
            self.update_locations(&last_update_ts).await?;
            self.update_spaces(&last_update_ts).await?;
            self.update_halls(&last_update_ts).await?;
            self.update_productions(&last_update_ts).await?;
            self.update_events(&last_update_ts).await?;
            Ok::<(), reqwest::Error>(())
        }
        .await;

        // save timestamp for next time
        if res.is_ok() {
            self.set_last_updated(current_ts).await;
        }

        res
    }

    /// fetch a collection of objects from the api
    ///
    /// it is wrapped in a `ApiCollection` with additional information
    async fn fetch_collection<T: DeserializeOwned>(
        &self,
        path: &str,
        page: u32,
        updated_after: &str,
    ) -> Result<ApiCollection<T>, reqwest::Error> {
        let url = format!("{API_BASE_URL}{path}");

        let request = self.client.get(&url).query(&[
            ("page", page.to_string().as_str()),
            ("updated_at[after]", updated_after),
        ]);

        request
            .header("X-AUTH-TOKEN", &self.auth_token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await
    }

    /// make a stream over the pages of the collection api results
    fn paginated_collection<T: DeserializeOwned>(
        &self,
        path: &str,
        updated_after: &str,
    ) -> impl Stream<Item = Result<Vec<T>, reqwest::Error>> {
        stream::unfold(Some(1), move |page_opt| async move {
            let page = page_opt?; // stop when page_opt is None

            match self.fetch_collection::<T>(path, page, updated_after).await {
                Ok(collection) => {
                    let next_page = collection.view.next.map(|_| page + 1);
                    Some((Ok(collection.members), next_page))
                }
                Err(e) => Some((Err(e), None)),
            }
        })
    }

    pub async fn update_productions(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Productions: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiProduction>("/productions", updated_after));

        while let Some(batch_result) = stream.next().await {
            let productions = batch_result?;
            let amt = productions.len();
            info!("Productions: got {amt} from api");
            for production in productions {
                self.db
                    .productions()
                    .insert(production.into())
                    .await
                    .unwrap();
            }
            info!("Productions: inserted {amt} into db");
        }

        info!("Productions: finished importing");
        Ok(())
    }

    pub async fn update_locations(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Locations: start updating");

        let mut stream =
            pin!(self.paginated_collection::<ApiLocation>("/locations", updated_after));

        while let Some(batch_result) = stream.next().await {
            let locations = batch_result?;
            let amt = locations.len();
            info!("Locations: got {amt} from api");
            for location in locations {
                self.db.locations().insert(location.into()).await.unwrap();
            }
            info!("Locations: inserted {amt} into db");
        }

        info!("Locations: finished importing");
        Ok(())
    }

    pub async fn update_spaces(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Spaces: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiSpace>("/spaces", updated_after));

        while let Some(batch_result) = stream.next().await {
            let spaces = batch_result?;
            let amt = spaces.len();
            info!("Spaces: got {amt} from api");
            for space in spaces {
                // first load in the related location and extract its id
                let location_source_id = extract_source_id(&space.location).unwrap();

                let location = self
                    .db
                    .locations()
                    .by_source_id(location_source_id)
                    .await
                    .unwrap();

                // construct a SpaceCreate out of it
                let space_create = space.to_create(location.id);

                self.db.spaces().insert(space_create).await.unwrap();
            }
            info!("Spaces: inserted {amt} into db");
        }

        info!("Spaces: finished importing");
        Ok(())
    }

    pub async fn update_halls(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Halls: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiHall>("/halls", updated_after));

        while let Some(batch_result) = stream.next().await {
            let halls = batch_result?;
            let amt = halls.len();
            info!("Halls: got {amt} from api");
            for hall in halls {
                let source_id = hall.space.as_deref().and_then(extract_source_id);
                let space_uuid = match source_id {
                    Some(id) => {
                        // get the uuid of the space with a source id from the db
                        let db_uuid = self
                            .db
                            .spaces()
                            .by_source_id(id)
                            .await
                            .unwrap()
                            .map(|s| s.id);

                        if db_uuid.is_none() {
                            warn!("Halls: Space source_id {id} expected but not found in db");
                        }
                        db_uuid
                    }
                    None => None,
                };

                // construct a HallCreate out of it
                let hall_create = hall.to_create(space_uuid);

                self.db.halls().insert(hall_create).await.unwrap();
            }
            info!("Halls: inserted {amt} into db");
        }

        info!("Halls: finished importing");
        Ok(())
    }

    pub async fn update_events(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("Events: start updating");

        let mut stream = pin!(self.paginated_collection::<ApiEvent>("/events", updated_after));

        while let Some(batch_result) = stream.next().await {
            let events = batch_result?;
            let amt = events.len();
            info!("Events: got {amt} from api");
            for event in events {
                let production_id = match event.production_source_id() {
                    Some(id) => {
                        match self.db.productions().by_source_id(id).await.unwrap() {
                            Some(p) => p.id,
                            None => {
                                warn!("Events: production source_id {id} not found in db, skipping");
                                continue;
                            }
                        }
                    }
                    None => {
                        warn!("Events: event has no production source_id, skipping");
                        continue;
                    }
                };

                let hall_uuid = match event.hall_source_id() {
                    Some(id) => {
                        let uuid = self.db.halls().by_source_id(id).await
                            .unwrap()
                            .map(|h| h.id);
                        if uuid.is_none() {
                            warn!("Events: hall source_id {id} not found in db");
                        }
                        uuid
                    }
                    None => None,
                };

                let event_create = event.to_create(production_id, hall_uuid);
                self.db.events().insert(event_create).await.unwrap();
            }
            info!("Events: inserted {amt} into db");
        }

        info!("Events: finished importing");
        Ok(())
    }
}
