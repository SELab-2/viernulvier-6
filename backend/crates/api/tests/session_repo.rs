mod common;

use chrono::Utc;
use db::{
    Database,
    models::{
        session::SessionCreate,
        user::{UserCreate, UserPatch, UserRole},
    },
    repos::{sessions::SessionRepo, user::UserRepo},
};
use sqlx::PgPool;

#[sqlx::test]
#[test_log::test]
async fn create_and_find_session(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let user_id = create_test_user(&db).await;

    let session = repo
        .create(SessionCreate {
            user_id,
            token_hash: "test-hash-1".into(),
            expires_at: Utc::now() + chrono::Duration::days(1),
        })
        .await
        .unwrap();

    assert_eq!(session.user_id, user_id);
    assert_eq!(session.token_hash, "test-hash-1");

    let found = repo.by_token_hash("test-hash-1").await.unwrap();
    assert_eq!(found.id, session.id);
}

#[sqlx::test]
#[test_log::test]
async fn find_nonexistent_token_returns_not_found(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let result = repo.by_token_hash("nonexistent-hash").await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn delete_existing_session(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let user_id = create_test_user(&db).await;

    let session = repo
        .create(SessionCreate {
            user_id,
            token_hash: "test-hash-2".into(),
            expires_at: Utc::now() + chrono::Duration::days(1),
        })
        .await
        .unwrap();

    repo.delete(session.id).await.unwrap();

    let result = repo.by_token_hash("test-hash-2").await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn delete_nonexistent_session_returns_not_found(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let result = repo.delete(uuid::Uuid::now_v7()).await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn delete_session_by_token_hash(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let user_id = create_test_user(&db).await;

    repo.create(SessionCreate {
        user_id,
        token_hash: "test-hash-3".into(),
        expires_at: Utc::now() + chrono::Duration::days(1),
    })
    .await
    .unwrap();

    repo.delete_by_token_hash("test-hash-3").await.unwrap();

    let result = repo.by_token_hash("test-hash-3").await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn delete_all_sessions_for_user(db: PgPool) {
    let repo = SessionRepo::new(&db);
    let user_id = create_test_user(&db).await;

    repo.create(SessionCreate {
        user_id,
        token_hash: "hash-a".into(),
        expires_at: Utc::now() + chrono::Duration::days(1),
    })
    .await
    .unwrap();

    repo.create(SessionCreate {
        user_id,
        token_hash: "hash-b".into(),
        expires_at: Utc::now() + chrono::Duration::days(1),
    })
    .await
    .unwrap();

    repo.delete_all_for_user(user_id).await.unwrap();

    let result_a = repo.by_token_hash("hash-a").await;
    let result_b = repo.by_token_hash("hash-b").await;
    assert!(result_a.is_err());
    assert!(result_b.is_err());
}

async fn create_test_user(db: &PgPool) -> uuid::Uuid {
    let repo = UserRepo::new(db);
    let user = repo
        .create(UserCreate {
            username: "testuser".into(),
            email: format!("test-{}@test.com", uuid::Uuid::now_v7()),
            password_hash: "hash".into(),
            role: UserRole::Editor,
        })
        .await
        .unwrap();
    user.id
}
