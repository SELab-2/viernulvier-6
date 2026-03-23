use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::info;

use crate::{
    error::DatabaseError,
    repos::{
        hall::HallRepo, internal_state::InternalStateRepo, location::LocationRepo, event::EventRepo,
        media::MediaRepo, production::ProductionRepo, space::SpaceRepo, user::UserRepo, sessions::SessionRepo,
        tag::TagRepo,
    },
};

pub mod models {
    pub mod artist;
    pub mod blogpost;
    pub mod entity_media;
    pub mod entity_type;
    pub mod facet;
    pub mod collection;
    pub mod collection_item;
    pub mod event;
    pub mod hall;
    pub mod internal_state;
    pub mod location;
    pub mod media;
    pub mod production;
    pub mod space;
    pub mod tag;
    pub mod tagging;
    pub mod user;
    pub mod session;
}

pub mod repos {
    pub mod event;
    pub mod hall;
    pub mod internal_state;
    pub mod location;
    pub mod media;
    pub mod production;
    pub mod space;
    pub mod tag;
    pub mod user;
    pub mod sessions;
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

    pub fn sessions<'a>(&'a self) -> SessionRepo<'a> {
        SessionRepo::new(&self.db)
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

    pub fn tags<'a>(&'a self) -> TagRepo<'a> {
        TagRepo::new(&self.db)
    }
  
    pub fn events<'a>(&'a self) -> EventRepo<'a> {
        EventRepo::new(&self.db)
    }

    pub fn media<'a>(&'a self) -> MediaRepo<'a> {
        MediaRepo::new(&self.db)
    }
}
