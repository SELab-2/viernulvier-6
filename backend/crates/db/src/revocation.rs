use sqlx::PgPool;
use std::{
    collections::HashMap,
    sync::{
        Arc, RwLock,
        atomic::{AtomicUsize, Ordering},
    },
    time::{Duration, Instant},
};
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
    checks_since_cleanup: Arc<AtomicUsize>,
    max_age: Duration,
}

impl RevokedUsers {
    pub fn new(max_age: Duration) -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
            checks_since_cleanup: Arc::new(AtomicUsize::new(0)),
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

    /// Update only the in-memory revocation set (used after transactional DB writes).
    pub fn mark_revoked(&self, user_id: Uuid) {
        let mut map = self.inner.write().expect("revoked lock poisoned");
        map.insert(user_id, Instant::now());
        map.retain(|_, ts| ts.elapsed() < self.max_age);
    }

    /// Clear a user from both the in-memory cache and the database.
    /// Used when a user re-authenticates (login) and revocation should be lifted.
    pub async fn undelete(&self, pool: &PgPool, user_id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM revoked_users WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await?;

        let mut map = self.inner.write().expect("revoked lock poisoned");
        map.remove(&user_id);
        Ok(())
    }

    /// Fast in-memory check with DB fallback.
    /// In normal operation (single server) the entry is always in the cache.
    /// DB fallback handles cold starts and multi-instance test setups.
    pub async fn is_revoked(&self, pool: &PgPool, user_id: Uuid) -> bool {
        let mut should_remove_current = false;
        {
            let map = self.inner.read().expect("revoked lock poisoned");
            match map.get(&user_id) {
                Some(ts) if ts.elapsed() < self.max_age => return true,
                Some(_) => should_remove_current = true,
                None => {}
            }
        }

        let should_cleanup_all =
            self.checks_since_cleanup.fetch_add(1, Ordering::Relaxed).is_multiple_of(256);
        if !should_remove_current && !should_cleanup_all {
            // Cache miss — check the database as a fallback
            if let Ok(Some(_)) = sqlx::query_as::<_, (Uuid,)>(
                "SELECT user_id FROM revoked_users WHERE user_id = $1",
            )
            .bind(user_id)
            .fetch_optional(pool)
            .await
            {
                let mut map = self.inner.write().expect("revoked lock poisoned");
                map.insert(user_id, Instant::now());
                return true;
            }
            return false;
        }

        let mut map = self.inner.write().expect("revoked lock poisoned");
        if should_cleanup_all {
            map.retain(|_, ts| ts.elapsed() < self.max_age);
        } else if should_remove_current {
            map.remove(&user_id);
        }

        map.get(&user_id)
            .map(|ts| ts.elapsed() < self.max_age)
            .unwrap_or(false)
    }
}
