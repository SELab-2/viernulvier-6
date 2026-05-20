use std::{fs, path::Path};

use api::seed::SeedImporter;
use database::Database;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;
use wiremock::{
    Mock, MockServer, ResponseTemplate,
    matchers::{method, path},
};

fn write_json(path: &Path, value: serde_json::Value) {
    fs::write(path, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
}

fn write_seed_files(raw_dir: &Path, image_url: &str) {
    fs::create_dir_all(raw_dir).unwrap();

    write_json(
        &raw_dir.join("manifest.json"),
        json!({ "max_updated_at": "2026-05-01T00:00:00Z" }),
    );

    for file in [
        "locations.json",
        "spaces.json",
        "halls.json",
        "prices.json",
        "price_ranks.json",
        "events.json",
        "event_prices.json",
        "event_statuses.json",
    ] {
        write_json(&raw_dir.join(file), json!([]));
    }

    write_json(
        &raw_dir.join("productions.json"),
        json!([
            {
                "@id": "https://www.viernulvier.gent/api/v1/productions/4242",
                "@type": "Production",
                "created_at": "2026-04-01T00:00:00Z",
                "updated_at": "2026-04-02T00:00:00Z",
                "vendor_id": "seed-test",
                "box_office_id": null,
                "performer_field": null,
                "performer_type": null,
                "attendance_mode": "offline",
                "supertitle": null,
                "title": { "nl": "Seed Productie", "en": "Seed Production", "fr": null },
                "artist": null,
                "meta_title": null,
                "meta_description": null,
                "tagline": null,
                "teaser": null,
                "description": null,
                "description_extra": null,
                "description_2": null,
                "video_1": null,
                "video_2": null,
                "quote": null,
                "quote_source": null,
                "programme": null,
                "info": null,
                "description_short": null,
                "eticket_info": null,
                "genres": [],
                "events": [],
                "media_gallery": "/api/v1/media-galleries/100",
                "review_gallery": null,
                "poster_gallery": null,
                "uitdatabank_keywords": [],
                "uitdatabank_theme": null,
                "uitdatabank_type": null
            }
        ]),
    );

    write_json(
        &raw_dir.join("media_galleries.json"),
        json!([
            {
                "production_source_id": 4242,
                "gallery_type": "media",
                "gallery_url": "/api/v1/media-galleries/100",
                "gallery": {
                    "@id": "/api/v1/media-galleries/100",
                    "@type": "MediaGallery",
                    "items": [
                        {
                            "@id": "/api/v1/media/9001",
                            "@type": "MediaObject",
                            "created_at": "2026-04-01T00:00:00Z",
                            "updated_at": "2026-04-02T00:00:00Z",
                            "type": "image",
                            "original_filename": "seed.jpg",
                            "position": 0,
                            "width": 1,
                            "height": 1,
                            "format": "image/jpeg",
                            "gallery": "/api/v1/media-galleries/100",
                            "title": { "nl": "Seed image", "en": null, "fr": null },
                            "description": { "nl": null, "en": null, "fr": null },
                            "credits": { "nl": null, "en": null, "fr": null },
                            "link": { "nl": image_url, "en": null, "fr": null },
                            "crops": []
                        },
                        {
                            "@id": "/api/v1/media/9002",
                            "@type": "MediaObject",
                            "created_at": "2026-04-01T00:00:00Z",
                            "updated_at": "2026-04-02T00:00:00Z",
                            "type": "image",
                            "original_filename": "seed-2.jpg",
                            "position": 0,
                            "width": 1,
                            "height": 1,
                            "format": "image/jpeg",
                            "gallery": "/api/v1/media-galleries/100",
                            "title": { "nl": "Seed image 2", "en": null, "fr": null },
                            "description": { "nl": null, "en": null, "fr": null },
                            "credits": { "nl": null, "en": null, "fr": null },
                            "link": { "nl": image_url, "en": null, "fr": null },
                            "crops": []
                        }
                    ]
                }
            }
        ]),
    );
}

#[sqlx::test]
#[test_log::test]
async fn seed_importer_imports_production_media_galleries(db: PgPool) {
    let image_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/seed.jpg"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-type", "image/jpeg")
                .set_body_bytes([0xff, 0xd8, 0xff, 0xd9]),
        )
        .mount(&image_server)
        .await;

    let s3_server = MockServer::start().await;
    Mock::given(method("PUT"))
        .respond_with(ResponseTemplate::new(200))
        .mount(&s3_server)
        .await;

    let seed_dir = std::env::temp_dir().join(format!("seed-media-{}", Uuid::now_v7()));
    let raw_dir = seed_dir.join("raw");
    write_seed_files(&raw_dir, &format!("{}/seed.jpg", image_server.uri()));

    unsafe {
        std::env::set_var("SEED_RAW_DIR", &raw_dir);
        std::env::set_var("S3_ENDPOINT", s3_server.uri());
        std::env::set_var("S3_ACCESS_KEY", "test-access-key");
        std::env::set_var("S3_SECRET_KEY", "test-secret-key");
        std::env::set_var("S3_BUCKET", "test-bucket");
    }

    let database = Database::new(db);
    let importer = SeedImporter::from_env(database.clone()).unwrap();

    importer.import_all().await.unwrap();

    let production = database
        .productions()
        .by_source_id(4242)
        .await
        .unwrap()
        .unwrap();
    let media = database
        .media()
        .by_source_uri("viernulvier", "/api/v1/media/9001")
        .await
        .unwrap()
        .expect("seed gallery media should be imported");
    let second_media = database
        .media()
        .by_source_uri("viernulvier", "/api/v1/media/9002")
        .await
        .unwrap()
        .expect("second seed gallery media should be imported despite duplicate cover position");

    let link_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM entity_media
         WHERE entity_type = 'production'
           AND entity_id = $1
           AND media_id = $2
           AND role = 'cover'
           AND is_cover_image = true",
    )
    .bind(production.production.id)
    .bind(media.id)
    .fetch_one(database.pool())
    .await
    .unwrap();

    let second_link_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM entity_media
         WHERE entity_type = 'production'
           AND entity_id = $1
           AND media_id = $2",
    )
    .bind(production.production.id)
    .bind(second_media.id)
    .fetch_one(database.pool())
    .await
    .unwrap();

    assert_eq!(link_count, 0);
    assert_eq!(second_link_count, 1);
}
