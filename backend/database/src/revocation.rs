use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
    time::{Duration, Instant},
};
use sqlx::PgPool;
use uuid::Uuid;

/// Persistent + in-memory set of revoked user IDs.
///
/// - On startup: loads existing revoked users from PostgreSQL into memory
/// - On revoke: inserts into DB + updates in-memory set
/// - Check: pure in-memory lookup (fast)
/// - Old entries are cleaned up automatically based on TTL
#[derive(Clone)]
pub struct RevokedUsers {
    inner: Arc<RwLock<HashMap<Uuid, Instant>>>,
    max_age: Duration,
}

impl RevokedUsers {
    pub fn new(max_age: Duration) -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
            max_age,
        }
    }

    /// Load previously revoked users from the database into memory.
    pub async fn load_from_db(&self, pool: &PgPool) -> Result<(), sqlx::Error> {
        let max_age_secs = self.max_age.as_secs() as i64;
        sqlx::query(
            "DELETE FROM revoked_users WHERE revoked_at < NOW() - ($1 * INTERVAL '1 second')",
        )
        .bind(max_age_secs)
        .execute(pool)
        .await?;

        let rows: Vec<(Uuid, i64)> = sqlx::query_as(
            "SELECT user_id, EXTRACT(EPOCH FROM (NOW() - revoked_at))::BIGINT AS age_seconds
             FROM revoked_users",
        )
        .fetch_all(pool)
        .await?;

        let now = Instant::now();
        let mut map = self.inner.write().expect("revoked lock poisoned");
        map.clear();
        for (user_id, age_seconds) in rows {
            let age = Duration::from_secs(age_seconds.max(0) as u64);
            let revoked_at = now.checked_sub(age).unwrap_or(now);
            map.insert(user_id, revoked_at);
        }
        Ok(())
    }

    /// Revoke a user: persist to DB + update in-memory set.
    /// Also cleans up DB entries older than the TTL to prevent unbounded growth.
    pub async fn revoke(&self, pool: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query(
            "INSERT INTO revoked_users (user_id) VALUES ($1)
             ON CONFLICT (user_id) DO UPDATE SET revoked_at = NOW()",
        )
        .bind(user_id)
        .execute(pool)
        .await?;

        // Clean up old DB entries (older than TTL)
        let max_age_secs = self.max_age.as_secs() as i64;
        sqlx::query(
            "DELETE FROM revoked_users WHERE revoked_at < NOW() - ($1 * INTERVAL '1 second')",
        )
        .bind(max_age_secs)
        .execute(pool)
        .await?;

        let mut map = self.inner.write().expect("revoked lock poisoned");
        map.insert(user_id, Instant::now());
        // Clean up old entries while we have the write lock
        map.retain(|_, ts| ts.elapsed() < self.max_age);
        Ok(())
    }

    /// Fast in-memory check.
    pub fn is_revoked(&self, user_id: Uuid) -> bool {
        let map = self.inner.read().expect("revoked lock poisoned");
        match map.get(&user_id) {
            Some(ts) => ts.elapsed() < self.max_age,
            None => false,
        }
    }
}
