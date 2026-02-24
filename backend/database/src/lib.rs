use sqlx::{PgPool, postgres::PgPoolOptions};

use crate::{error::DatabaseError, repos::user::UserRepo};

pub mod models {
    pub mod artist;
    pub mod event;
    pub mod production;
    pub mod user;
}

pub mod repos {
    pub mod user;
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
        // connect to database
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(db_url)
            .await?;

        // run migrations
        sqlx::migrate!("../migrations").run(&db).await?;

        Ok(Self { db })
    }

    pub fn users<'a>(&'a self) -> UserRepo<'a> {
        UserRepo::new(&self.db)
    }
}
