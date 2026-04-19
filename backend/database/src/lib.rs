use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::info;

use crate::{
    error::DatabaseError,
    repos::{
        article::ArticleRepo, artist::ArtistRepo, collection::CollectionRepo, event::EventRepo,
        event_price::EventPriceRepo, hall::HallRepo, internal_state::InternalStateRepo,
        location::LocationRepo, media::MediaRepo, media_variant::MediaVariantRepo,
        normalization_log::NormalizationLogRepo, price::PriceRepo, price_rank::PriceRankRepo,
        import_error::ImportErrorRepo
        production::ProductionRepo, series::SeriesRepo, sessions::SessionRepo, space::SpaceRepo,
        tag::TagRepo, user::UserRepo,
    },
};

pub mod models {
    pub mod article;
    pub mod artist;
    pub mod collection;
    pub mod collection_item;
    pub mod entity_media;
    pub mod entity_type;
    pub mod event;
    pub mod event_price;
    pub mod facet;
    pub mod filtering;
    pub mod hall;
    pub mod import_error;
    pub mod internal_state;
    pub mod location;
    pub mod media;
    pub mod media_variant;
    pub mod normalization_log;
    pub mod price;
    pub mod price_rank;
    pub mod production;
    pub mod series;
    pub mod session;
    pub mod space;
    pub mod tag;
    pub mod tagging;
    pub mod user;
}

pub mod repos {
    pub mod article;
    pub mod artist;
    pub mod collection;
    pub mod event;
    pub mod event_price;
    pub mod hall;
    pub mod import_error;
    pub mod internal_state;
    pub mod location;
    pub mod media;
    pub mod media_variant;
    pub mod normalization_log;
    pub mod price;
    pub mod price_rank;
    pub mod production;
    pub mod series;
    pub mod sessions;
    pub mod space;
    pub mod tag;
    pub mod user;
    pub mod query_filters {
        pub mod facets;
    }
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

    pub fn articles<'a>(&'a self) -> ArticleRepo<'a> {
        ArticleRepo::new(&self.db)
    }

    pub fn artists<'a>(&'a self) -> ArtistRepo<'a> {
        ArtistRepo::new(&self.db)
    }

    pub fn collections<'a>(&'a self) -> CollectionRepo<'a> {
        CollectionRepo::new(&self.db)
    }

    pub fn series<'a>(&'a self) -> SeriesRepo<'a> {
        SeriesRepo::new(&self.db)
    }

    pub fn media<'a>(&'a self) -> MediaRepo<'a> {
        MediaRepo::new(&self.db)
    }

    pub fn media_variants<'a>(&'a self) -> MediaVariantRepo<'a> {
        MediaVariantRepo::new(&self.db)
    }

    pub fn prices<'a>(&'a self) -> PriceRepo<'a> {
        PriceRepo::new(&self.db)
    }

    pub fn price_ranks<'a>(&'a self) -> PriceRankRepo<'a> {
        PriceRankRepo::new(&self.db)
    }

    pub fn event_prices<'a>(&'a self) -> EventPriceRepo<'a> {
        EventPriceRepo::new(&self.db)
    }

    pub fn normalization_log<'a>(&'a self) -> NormalizationLogRepo<'a> {
        NormalizationLogRepo::new(&self.db)
    }

    pub fn import_errors<'a>(&'a self) -> ImportErrorRepo<'a> {
    }
}
