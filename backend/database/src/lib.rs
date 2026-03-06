use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::info;

use crate::{
    error::DatabaseError,
    repos::{internal_state::InternalStateRepo, production::ProductionRepo, user::UserRepo, location::LocationRepo, hall::HallRepo, space::SpaceRepo},
};

pub mod models {
    pub mod artist;
    pub mod blogpost;
    pub mod collection;
    pub mod collection_item;
    pub mod event;
    pub mod internal_state;
    pub mod production;
    pub mod user;
    pub mod location;
    pub mod hall;
    pub mod space;
}

pub mod repos {
    pub mod internal_state;
    pub mod production;
    pub mod user;
    pub mod location;
    pub mod hall;
    pub mod space;
}

pub mod error;

#[derive(Clone)]
pub struct Database {
    db: PgPool,
}

impl Database {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create_connect_migrate(db_url: &str) -> Result<Self, DatabaseError> {
        info!("connecting to database");
        // connect to database
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await?;

        // run migrations
        info!("running migrations");
        sqlx::migrate!("../migrations").run(&db).await?;

        Ok(Self { db })
    }

    pub fn users<'a>(&'a self) -> UserRepo<'a> {
        UserRepo::new(&self.db)
    }

    pub fn internal<'a>(&'a self) -> InternalStateRepo<'a> {
        InternalStateRepo::new(&self.db)
    }

    pub fn productions<'a>(&'a self) -> ProductionRepo<'a> {
        ProductionRepo::new(&self.db)
    }

    pub fn locations<'a>(&'a self) -> LocationRepo<'a> {
        LocationRepo::new(&self.db)
    }

    pub fn halls<'a>(&'a self) -> HallRepo<'a> {
        HallRepo::new(&self.db)
    }

    pub fn spaces<'a>(&'a self) -> SpaceRepo<'a> {
        SpaceRepo::new(&self.db)
    }
}

