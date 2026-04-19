use sqlx::PgPool;

pub struct ImportRepo<'a> {
    #[allow(dead_code)]
    db: &'a PgPool,
}

impl<'a> ImportRepo<'a> {
    pub fn new(db: &'a PgPool) -> Self {
        Self { db }
    }
}
