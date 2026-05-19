use ingest::ApiImporter;
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

pub fn calculate_next_run() -> DateTime<Local> {
    calculate_next_run_from(Local::now())
}

fn calculate_next_run_from(now: DateTime<Local>) -> DateTime<Local> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{NaiveDate, TimeZone};

    /// helper function
    fn create_local_datetime(
        year: i32,
        month: u32,
        day: u32,
        hour: u32,
        min: u32,
    ) -> DateTime<Local> {
        let naive_date = NaiveDate::from_ymd_opt(year, month, day).unwrap();
        let naive_time = NaiveTime::from_hms_opt(hour, min, 0).unwrap();
        let naive_dt = naive_date.and_time(naive_time);

        Local.from_local_datetime(&naive_dt).unwrap()
    }

    #[test]
    fn test_before_target_time_schedules_for_today() {
        // May 14, 2026 3:00 AM
        let mock_now = create_local_datetime(2026, 5, 14, 3, 0);
        let next_run = calculate_next_run_from(mock_now);

        // should be 5:00 AM on the same day
        let expected_run = create_local_datetime(2026, 5, 14, 5, 0);
        assert_eq!(next_run, expected_run);
    }

    #[test]
    fn test_after_target_time_schedules_for_tomorrow() {
        // May 14, 2026 10:00 AM
        let mock_now = create_local_datetime(2026, 5, 14, 10, 0);
        let next_run = calculate_next_run_from(mock_now);

        // should be 5:00 AM on the next day
        let expected_run = create_local_datetime(2026, 5, 15, 5, 0);
        assert_eq!(next_run, expected_run);
    }

    #[test]
    fn test_exactly_at_target_time_schedules_for_tomorrow() {
        // May 14, 2026 5:00 AM
        let mock_now = create_local_datetime(2026, 5, 14, 5, 0);
        let next_run = calculate_next_run_from(mock_now);

        // should schedule on next day because 5am is already passed
        let expected_run = create_local_datetime(2026, 5, 15, 5, 0);
        assert_eq!(next_run, expected_run);
    }
}
