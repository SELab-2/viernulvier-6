use std::pin::pin;

use chrono::Utc;
use database::{Database, models::internal_state::InternalStateKey};
use futures::{Stream, StreamExt, stream};
use reqwest::Client;
use serde::de::DeserializeOwned;
use tracing::{info, warn};

use crate::models::{
    collection::ApiCollection,
    production::ApiProduction,
    location::ApiLocation,
    hall::ApiHall,
    space::ApiSpace
};

use crate::helper::extract_source_id;

mod helper;
pub mod models {
    pub mod collection;
    pub mod event;
    pub mod genre;
    pub mod hall;
    pub mod localized_text;
    pub mod media;
    pub mod production;
    pub mod space;
    pub mod location;
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
    pub async fn update_since_last(&self) {
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
            Ok::<(), reqwest::Error>(())
        }
        .await;

        // save timestamp for next time
        if res.is_ok() {
            self.set_last_updated(current_ts).await;
        }
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
        info!("start updating productions");

        let mut stream =
            pin!(self.paginated_collection::<ApiProduction>("/productions", updated_after));

        while let Some(batch_result) = stream.next().await {
            let productions = batch_result?;
            let amt = productions.len();
            info!("got {amt} productions from api");
            for production in productions {
                self.db
                    .productions()
                    .insert(production.into())
                    .await
                    .unwrap();
            }
            info!("inserted {amt} productions into db");
        }

        info!("finished importing productions");
        Ok(())
    }

    pub async fn update_locations(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("start updating locations");

        let mut stream =
            pin!(self.paginated_collection::<ApiLocation>("/locations", updated_after));

        while let Some(batch_result) = stream.next().await {
            let locations = batch_result?;
            let amt = locations.len();
            info!("got {amt} locations from api");
            for location in locations {
                self.db
                    .locations()
                    .insert(location.into())
                    .await
                    .unwrap();
            }
            info!("inserted {amt} locations into db");
        }

        info!("finished importing locations");
        Ok(())
    }

    pub async fn update_spaces(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("start updating spaces");

        let mut stream =
            pin!(self.paginated_collection::<ApiSpace>("/spaces", updated_after));

        while let Some(batch_result) = stream.next().await {
            let spaces = batch_result?;
            let amt = spaces.len();
            info!("got {amt} spaces from api");
            for space in spaces {

                // first load in the related location and extract its id
                let location_source_id = extract_source_id(&space.location);

                let location = self.db
                    .locations()
                    .by_source_id(location_source_id)
                    .await
                    .unwrap();
                
                // construct a SpaceCreate out of it
                let space_create = space.to_create(location.id);

                self.db
                    .spaces()
                    .insert(space_create)
                    .await
                    .unwrap();
            }
            info!("inserted {amt} spaces into db");
        }

        info!("finished importing spaces");
        Ok(())
    }

    pub async fn update_halls(&self, updated_after: &str) -> Result<(), reqwest::Error> {
        info!("start updating halls");

        let mut stream =
            pin!(self.paginated_collection::<ApiHall>("/halls", updated_after));

        while let Some(batch_result) = stream.next().await {
            let halls = batch_result?;
            let amt = halls.len();
            info!("got {amt} halls from api");
            for hall in halls {

                // first load in the related space and extract its id
                let space_source_id = extract_source_id(&hall.space);

                let space = self.db
                    .spaces()
                    .by_source_id(space_source_id)
                    .await
                    .unwrap();
                
                // construct a HallCreate out of it
                let hall_create = hall.to_create(space.id);

                self.db
                    .halls()
                    .insert(hall_create)
                    .await
                    .unwrap();
            }
            info!("inserted {amt} halls into db");
        }

        info!("finished importing halls");
        Ok(())
    }
}
