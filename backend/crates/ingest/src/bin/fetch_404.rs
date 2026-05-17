//! Stage 1 of the seed pipeline: mirror the full 404 API into local JSON files.
//!
//! Invocation:
//!   API_KEY_404=... cargo run --release -p api --bin fetch_404
//!
//! Selective fetch: useful for refreshing certain entities
//!   cargo run -p api --bin fetch_404 -- tags genres uitdatabank_keywords
//!   cargo run -p api --bin fetch_404 -- --list
//!   cargo run -p api --bin fetch_404 -- --help
//!
//! Output: `backend/seed/raw/*.json` + `backend/seed/raw/manifest.json`.
//! rerunning overwrites selected files and merges
//! their row counts into the existing manifest.

use std::collections::{BTreeMap, HashSet};
use std::path::PathBuf;
use std::time::Instant;

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde_json::{Value, json};
use tracing::{info, warn};

type BoxError = Box<dyn std::error::Error + Send + Sync>;

const API_BASE_URL: &str = "https://www.viernulvier.gent/api/v1";
const BASE_URL: &str = "https://www.viernulvier.gent";
const EPOCH: &str = "2000-01-01T00:00:00Z";

const GALLERIES_NAME: &str = "media_galleries";
const GALLERIES_FILE: &str = "media_galleries.json";

/// Collection endpoints to mirror verbatim. `(name, output filename, api path)`.
///
/// `name` is the short identifier accepted on the CLI. The `updated_at[after]=<epoch>`
/// filter is always applied, so taxonomy endpoints return the full set on every run.
const ENDPOINTS: &[(&str, &str, &str)] = &[
    // Core entities
    ("productions", "productions.json", "/productions"),
    ("locations", "locations.json", "/locations"),
    ("spaces", "spaces.json", "/spaces"),
    ("halls", "halls.json", "/halls"),
    ("events", "events.json", "/events"),
    ("prices", "prices.json", "/prices"),
    ("price_ranks", "price_ranks.json", "/prices/ranks"),
    ("event_prices", "event_prices.json", "/events/prices"),
    // Taxonomies - always fully mirrored, used by stage 2 normalization
    ("genres", "genres.json", "/genres"),
    ("tags", "tags.json", "/tags"),
    (
        "uitdatabank_keywords",
        "uitdatabank_keywords.json",
        "/uitdatabank/keywords",
    ),
    (
        "uitdatabank_themes",
        "uitdatabank_themes.json",
        "/uitdatabank/themes",
    ),
    (
        "uitdatabank_types",
        "uitdatabank_types.json",
        "/uitdatabank/types",
    ),
    ("event_statuses", "event_statuses.json", "/events/statuses"),
];

enum Selection {
    All,
    Only(HashSet<String>),
}

impl Selection {
    fn includes(&self, name: &str) -> bool {
        match self {
            Self::All => true,
            Self::Only(set) => set.contains(name),
        }
    }
}

fn parse_args() -> Result<Selection, BoxError> {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.iter().any(|a| a == "-h" || a == "--help") {
        print_help();
        std::process::exit(0);
    }
    if args.iter().any(|a| a == "--list") {
        print_available();
        std::process::exit(0);
    }

    let mut names: HashSet<String> = HashSet::new();
    for raw in args {
        // accept `--only=a,b,c`, `--only a b c`, or plain positional `a b c`.
        let stripped = raw.strip_prefix("--only=").unwrap_or(&raw);
        if stripped == "--only" {
            continue;
        }
        if stripped.starts_with("--") {
            return Err(format!("unknown flag: {raw}").into());
        }
        for part in stripped.split(',') {
            let p = part.trim();
            if !p.is_empty() {
                names.insert(p.to_string());
            }
        }
    }

    if names.is_empty() {
        return Ok(Selection::All);
    }

    let valid: HashSet<&str> = ENDPOINTS
        .iter()
        .map(|(n, _, _)| *n)
        .chain(std::iter::once(GALLERIES_NAME))
        .collect();
    for n in &names {
        if !valid.contains(n.as_str()) {
            return Err(
                format!("unknown selection: '{n}'. Use --list to see available names.").into(),
            );
        }
    }
    Ok(Selection::Only(names))
}

fn print_help() {
    println!(
        "fetch_404 - mirror the 404 API into backend/seed/raw/*.json\n\
         \n\
         USAGE:\n\
         \x20   fetch_404 [SELECTION]\n\
         \n\
         With no selection, every endpoint is fetched. A selection fetches only the\n\
         named entities and merges their counts into the existing manifest.\n\
         \n\
         OPTIONS:\n\
         \x20   --list           show available entity names and exit\n\
         \x20   --help, -h       show this help and exit\n\
         \n\
         SELECTION FORMATS:\n\
         \x20   positional:      fetch_404 tags genres uitdatabank_keywords\n\
         \x20   comma-list:      fetch_404 --only tags,genres\n\
         \x20   equals-form:     fetch_404 --only=tags,genres\n\
         \n\
         NOTES:\n\
         \x20 * `media_galleries` requires productions in memory. If selected alone,\n\
         \x20   productions.json is loaded from disk if present; otherwise the fetch aborts.\n\
         \x20 * Taxonomies are always fully mirrored (no updated_at filter affects them).\n\
         "
    );
}

fn print_available() {
    println!("Available entities (for selective fetch):\n");
    for (name, file, path) in ENDPOINTS {
        println!("  {name:<22} {path:<30}  -> {file}");
    }
    println!("  {GALLERIES_NAME:<22} (derived from productions)  -> {GALLERIES_FILE}");
}

#[tokio::main]
async fn main() -> Result<(), BoxError> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let selection = parse_args()?;
    let auth_token = std::env::var("API_KEY_404").map_err(|_| "API_KEY_404 env var is required")?;

    let out_dir = resolve_out_dir()?;
    std::fs::create_dir_all(&out_dir)?;
    info!(path = %out_dir.display(), "writing raw JSON mirror");

    let client = Client::builder().user_agent("selab6-fetch_404").build()?;

    let started = Utc::now();
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    let mut max_updated_at: Option<DateTime<Utc>> = None;
    let mut production_gallery_refs: Option<Vec<GalleryRefs>> = None;

    for (name, filename, path) in ENDPOINTS {
        if !selection.includes(name) {
            continue;
        }
        let t0 = Instant::now();
        let members = fetch_all_pages(&client, &auth_token, path).await?;
        info!(
            endpoint = path,
            count = members.len(),
            elapsed_ms = t0.elapsed().as_millis() as u64,
            "fetched collection"
        );

        if *name == "productions" {
            max_updated_at = members
                .iter()
                .filter_map(|m| m.get("updated_at").and_then(Value::as_str))
                .filter_map(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .max();
            production_gallery_refs = Some(extract_gallery_refs(&members));
        }

        counts.insert((*filename).to_string(), members.len());
        write_json(&out_dir.join(filename), &Value::Array(members))?;
    }

    if selection.includes(GALLERIES_NAME) {
        let refs = match production_gallery_refs {
            Some(r) => r,
            None => load_gallery_refs_from_disk(&out_dir)?,
        };
        let gallery_entries = fetch_media_galleries(&client, &auth_token, &refs).await;
        counts.insert(GALLERIES_FILE.to_string(), gallery_entries.len());
        write_json(
            &out_dir.join(GALLERIES_FILE),
            &Value::Array(gallery_entries),
        )?;
    }

    write_manifest(&out_dir, started, max_updated_at, &counts, &selection)?;
    info!("done");
    Ok(())
}

fn extract_gallery_refs(productions: &[Value]) -> Vec<GalleryRefs> {
    productions
        .iter()
        .filter_map(|m| {
            let source_id = m
                .get("@id")
                .and_then(Value::as_str)
                .and_then(|id| id.rsplit('/').next())
                .and_then(|s| s.parse::<i64>().ok())?;
            Some(GalleryRefs {
                source_id,
                media: m
                    .get("media_gallery")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                review: m
                    .get("review_gallery")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                poster: m
                    .get("poster_gallery")
                    .and_then(Value::as_str)
                    .map(str::to_string),
            })
        })
        .collect()
}

fn load_gallery_refs_from_disk(out_dir: &std::path::Path) -> Result<Vec<GalleryRefs>, BoxError> {
    let path = out_dir.join("productions.json");
    let file = std::fs::File::open(&path).map_err(|e| -> BoxError {
        format!(
            "productions.json not found at {}: {e}. Run `fetch_404 productions` first, or include it in the selection.",
            path.display()
        )
        .into()
    })?;
    let members: Vec<Value> = serde_json::from_reader(std::io::BufReader::new(file))?;
    info!(
        count = members.len(),
        "loaded productions from disk for gallery refs"
    );
    Ok(extract_gallery_refs(&members))
}

fn write_manifest(
    out_dir: &std::path::Path,
    started: DateTime<Utc>,
    max_updated_at: Option<DateTime<Utc>>,
    counts: &BTreeMap<String, usize>,
    selection: &Selection,
) -> Result<(), BoxError> {
    let manifest_path = out_dir.join("manifest.json");
    let mut manifest = std::fs::File::open(&manifest_path)
        .ok()
        .and_then(|f| serde_json::from_reader::<_, Value>(std::io::BufReader::new(f)).ok())
        .unwrap_or_else(|| json!({}));

    // Merge counts: preserve existing entries for files not in this run.
    let merged = {
        let mut map: BTreeMap<String, usize> = manifest
            .get("counts")
            .and_then(Value::as_object)
            .map(|obj| {
                obj.iter()
                    .filter_map(|(k, v)| v.as_u64().map(|n| (k.clone(), n as usize)))
                    .collect()
            })
            .unwrap_or_default();
        for (k, v) in counts {
            map.insert(k.clone(), *v);
        }
        map
    };

    manifest["api_base_url"] = json!(API_BASE_URL);
    manifest["fetched_at"] = json!(started.to_rfc3339());
    manifest["finished_at"] = json!(Utc::now().to_rfc3339());
    manifest["counts"] = json!(merged);
    manifest["last_selection"] = match selection {
        Selection::All => json!("all"),
        Selection::Only(names) => {
            let mut v: Vec<&str> = names.iter().map(String::as_str).collect();
            v.sort();
            json!(v)
        }
    };

    // Only overwrite max_updated_at when productions was part of this run.
    if let Some(mu) = max_updated_at {
        manifest["max_updated_at"] = json!(mu.to_rfc3339());
    } else if manifest.get("max_updated_at").is_none() {
        manifest["max_updated_at"] = Value::Null;
    }

    write_json(&manifest_path, &manifest)
}

fn resolve_out_dir() -> Result<PathBuf, BoxError> {
    if let Ok(dir) = std::env::var("SEED_RAW_DIR") {
        return Ok(PathBuf::from(dir));
    }
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR")
        .map_err(|_| "CARGO_MANIFEST_DIR not set; run via `cargo run`")?;
    Ok(PathBuf::from(manifest_dir)
        .join("..")
        .join("seed")
        .join("raw"))
}

fn write_json(path: &std::path::Path, value: &Value) -> Result<(), BoxError> {
    let tmp = path.with_extension("json.tmp");
    let file = std::fs::File::create(&tmp)?;
    serde_json::to_writer_pretty(std::io::BufWriter::new(file), value)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Walks every page of a collection endpoint until `view.next` is null,
/// returning the raw `member` values untouched.
async fn fetch_all_pages(
    client: &Client,
    auth_token: &str,
    path: &str,
) -> Result<Vec<Value>, BoxError> {
    let mut out = Vec::new();
    let mut page: u32 = 1;

    loop {
        let url = format!("{API_BASE_URL}{path}");
        let body: Value = client
            .get(&url)
            .query(&[
                ("page", page.to_string()),
                ("updated_at[after]", EPOCH.to_string()),
            ])
            .header("X-AUTH-TOKEN", auth_token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        let members = body
            .get("member")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();

        let has_next = body
            .get("view")
            .and_then(|v| v.get("next"))
            .and_then(Value::as_str)
            .is_some();

        let batch_len = members.len();
        out.extend(members);

        if !has_next || batch_len == 0 {
            break;
        }
        page += 1;
    }

    Ok(out)
}

struct GalleryRefs {
    source_id: i64,
    media: Option<String>,
    review: Option<String>,
    poster: Option<String>,
}

async fn fetch_media_galleries(
    client: &Client,
    auth_token: &str,
    refs: &[GalleryRefs],
) -> Vec<Value> {
    let mut out = Vec::new();
    let mut fetched = 0usize;
    let mut failed = 0usize;
    let total = refs.len();

    for (idx, gref) in refs.iter().enumerate() {
        let source_id = gref.source_id;
        for (gallery_type, maybe_path) in [
            ("media", &gref.media),
            ("review", &gref.review),
            ("poster", &gref.poster),
        ] {
            let Some(path) = maybe_path else {
                continue;
            };
            let url = format!("{BASE_URL}{path}");
            let send_result = client
                .get(&url)
                .header("X-AUTH-TOKEN", auth_token)
                .send()
                .await;

            match send_result {
                Ok(resp) => match resp.error_for_status() {
                    Ok(resp) => match resp.json::<Value>().await {
                        Ok(body) => {
                            out.push(json!({
                                "production_source_id": source_id,
                                "gallery_type": gallery_type,
                                "gallery_url": path,
                                "gallery": body,
                            }));
                            fetched += 1;
                        }
                        Err(e) => {
                            warn!(source_id, gallery_type, error = %e, "gallery body parse failed");
                            failed += 1;
                        }
                    },
                    Err(e) if e.status() == Some(reqwest::StatusCode::NOT_FOUND) => {
                        // Gallery referenced but missing on their side. Rare but fine.
                    }
                    Err(e) => {
                        warn!(source_id, gallery_type, error = %e, "gallery fetch failed");
                        failed += 1;
                    }
                },
                Err(e) => {
                    warn!(source_id, gallery_type, error = %e, "gallery request failed");
                    failed += 1;
                }
            }
        }

        if (idx + 1) % 50 == 0 {
            info!(
                progress = idx + 1,
                total, fetched, failed, "gallery progress"
            );
        }
    }

    info!(fetched, failed, total, "gallery fetch done");
    out
}
