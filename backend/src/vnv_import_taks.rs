use api::ApiImporter;
use chrono::{DateTime, Duration, Local, NaiveTime, TimeZone};
use tokio::time::sleep;
use tracing::info;

use crate::error;

const TARGET_TIME: NaiveTime =
    NaiveTime::from_hms_opt(5, 0, 0).expect("5:00:00 is a valid constant");

/// starts the importer in a thread and runs at `const TARGET_TIME` every day, forever
pub fn start_importer(api_importer: ApiImporter) {
    tokio::spawn(async move {
        loop {
            info!("starting importer");
            match api_importer.update_since_last().await {
                Ok(()) => info!("API importer finished successfully"),
                Err(e) => error!("API imported ended with error: {e:?}"),
            }

            let now = Local::now();
            let next_run = calculate_next_run();

            let sleep_duration = (next_run - now)
                .to_std()
                .unwrap_or_else(|_| std::time::Duration::from_secs(60));

            info!("Next API import scheduled to run in {:?}", sleep_duration);

            sleep(sleep_duration).await;
        }
    });
}

fn calculate_next_run() -> DateTime<Local> {
    let now = Local::now();

    let mut target_date = now.date_naive();

    // if we are past 5AM today, target tomorrow
    if now.time() >= TARGET_TIME {
        target_date += Duration::days(1);
    }

    let naive_target = target_date.and_time(TARGET_TIME);

    // datetime when to run next
    // safely
    match Local.from_local_datetime(&naive_target) {
        chrono::LocalResult::Single(t) => t,
        chrono::LocalResult::Ambiguous(t1, _t2) => t1,
        // daylight savings, the hour might be skipped (who knows)
        // target 1 hour later
        chrono::LocalResult::None => {
            Local
                .from_local_datetime(&(naive_target + Duration::hours(1)))
                .single()
                // worst case fallback, just target tomorrow
                .unwrap_or_else(|| now + Duration::days(1))
        }
    }
}
