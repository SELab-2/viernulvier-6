mod common;

use db::{
    models::user::{UserCreate, UserPatch, UserRole},
    repos::user::UserRepo,
};
use sqlx::PgPool;

#[sqlx::test]
#[test_log::test]
async fn create_and_find_user_by_email(db: PgPool) {
    let repo = UserRepo::new(&db);

    let user = repo
        .create(UserCreate {
            username: "findme".into(),
            email: "findme@test.com".into(),
            password_hash: "hash".into(),
            role: UserRole::Editor,
        })
        .await
        .unwrap();

    assert_eq!(user.email, "findme@test.com");
    assert_eq!(user.role, UserRole::Editor);

    let found = repo.by_email("findme@test.com").await.unwrap();
    assert_eq!(found.id, user.id);
    assert_eq!(found.username, "findme");
}

#[sqlx::test]
#[test_log::test]
async fn by_email_not_found(db: PgPool) {
    let repo = UserRepo::new(&db);
    let result = repo.by_email("nobody@test.com").await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn by_id_found_and_not_found(db: PgPool) {
    let repo = UserRepo::new(&db);

    let user = repo
        .create(UserCreate {
            username: "byid".into(),
            email: "byid@test.com".into(),
            password_hash: "hash".into(),
            role: UserRole::User,
        })
        .await
        .unwrap();

    let found = repo.by_id(user.id).await.unwrap();
    assert_eq!(found.id, user.id);

    let result = repo.by_id(uuid::Uuid::now_v7()).await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn has_admin_detects_presence(db: PgPool) {
    let repo = UserRepo::new(&db);

    assert!(!repo.has_admin().await.unwrap());

    repo.create(UserCreate {
        username: "admin".into(),
        email: "admin@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::Admin,
    })
    .await
    .unwrap();

    assert!(repo.has_admin().await.unwrap());
}

#[sqlx::test]
#[test_log::test]
async fn list_summaries_returns_users(db: PgPool) {
    let repo = UserRepo::new(&db);

    repo.create(UserCreate {
        username: "alice".into(),
        email: "alice@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::Editor,
    })
    .await
    .unwrap();

    repo.create(UserCreate {
        username: "bob".into(),
        email: "bob@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::User,
    })
    .await
    .unwrap();

    let summaries = repo.list_summaries().await.unwrap();
    assert_eq!(summaries.len(), 2);
    assert_eq!(summaries[0].username, "alice");
    assert_eq!(summaries[1].username, "bob");
}

#[sqlx::test]
#[test_log::test]
async fn admin_count_counts_admins(db: PgPool) {
    let repo = UserRepo::new(&db);

    assert_eq!(repo.admin_count().await.unwrap(), 0);

    repo.create(UserCreate {
        username: "admin1".into(),
        email: "admin1@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::Admin,
    })
    .await
    .unwrap();

    repo.create(UserCreate {
        username: "admin2".into(),
        email: "admin2@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::Admin,
    })
    .await
    .unwrap();

    repo.create(UserCreate {
        username: "editor".into(),
        email: "editor@test.com".into(),
        password_hash: "hash".into(),
        role: UserRole::Editor,
    })
    .await
    .unwrap();

    assert_eq!(repo.admin_count().await.unwrap(), 2);
}

#[sqlx::test]
#[test_log::test]
async fn delete_existing_user(db: PgPool) {
    let repo = UserRepo::new(&db);

    let user = repo
        .create(UserCreate {
            username: "todelete".into(),
            email: "todelete@test.com".into(),
            password_hash: "hash".into(),
            role: UserRole::User,
        })
        .await
        .unwrap();

    repo.delete(user.id).await.unwrap();

    let result = repo.by_id(user.id).await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn delete_nonexistent_user_returns_not_found(db: PgPool) {
    let repo = UserRepo::new(&db);
    let result = repo.delete(uuid::Uuid::now_v7()).await;
    assert!(result.is_err());
}

#[sqlx::test]
#[test_log::test]
async fn patch_user_updates_fields(db: PgPool) {
    let repo = UserRepo::new(&db);

    let user = repo
        .create(UserCreate {
            username: "original".into(),
            email: "original@test.com".into(),
            password_hash: "hash".into(),
            role: UserRole::User,
        })
        .await
        .unwrap();

    let patched = repo
        .patch(
            user.id,
            UserPatch {
                username: "patched".into(),
                role: Some(UserRole::Editor),
            },
        )
        .await
        .unwrap();

    assert_eq!(patched.username, "patched");
    assert_eq!(patched.role, UserRole::Editor);
    assert_eq!(patched.email, "original@test.com");
}
