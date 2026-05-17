use std::collections::BTreeMap;
use std::io::Cursor;

use thiserror::Error;

const PREVIEW_LIMIT: usize = 20;

/// Result of a CSV preview parse — headers, up to 20 rows, and the total row count.
#[derive(Debug, Clone)]
pub struct ParsedCsvPreview {
    pub headers: Vec<String>,
    pub preview_rows: Vec<BTreeMap<String, Option<String>>>,
    pub total_rows: usize,
}

#[derive(Debug, Error)]
pub enum CsvParseError {
    #[error("CSV parsing failed: {0}")]
    Parse(String),
    #[error("CSV header row is empty")]
    EmptyHeader,
    #[error("CSV header contains duplicate column: {0}")]
    DuplicateHeader(String),
}

/// Strip a UTF-8 BOM (`0xEF 0xBB 0xBF`) from the front of `bytes` if present.
fn strip_bom(bytes: &[u8]) -> &[u8] {
    if bytes.starts_with(b"\xef\xbb\xbf") {
        bytes.get(3..).unwrap_or(bytes)
    } else {
        bytes
    }
}

/// Normalize legacy MySQL-ish CSV escapes seen in old VierNulVier exports.
///
/// Some rows contain `\"` immediately before a delimiter or line ending inside
/// a quoted field. In those files the backslash is an escape marker for the
/// field's closing quote, not data. The `csv` crate correctly treats that as
/// non-standard CSV, so we remove only that narrow backslash pattern before
/// parsing.
fn normalize_legacy_escapes(bytes: &[u8], delimiter: u8) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;

    while i < bytes.len() {
        if let Some(line_end_offset) = backslash_only_line_len(bytes, i) {
            if let Some(line_end) = bytes.get(i + line_end_offset) {
                if *line_end == b'\r' && bytes.get(i + line_end_offset + 1) == Some(&b'\n') {
                    i += line_end_offset + 2;
                } else {
                    i += line_end_offset + 1;
                }
                continue;
            }
        }

        let is_backslash_before_closing_quote = bytes.get(i) == Some(&b'\\')
            && bytes.get(i + 1) == Some(&b'"')
            && matches!(
                bytes.get(i + 2),
                Some(next) if *next == delimiter || *next == b'\n' || *next == b'\r'
            );

        if is_backslash_before_closing_quote {
            out.push(b'"');
            i += 2;
        } else if let Some(byte) = bytes.get(i) {
            out.push(*byte);
            i += 1;
        } else {
            break;
        }
    }

    out
}

fn backslash_only_line_len(bytes: &[u8], start: usize) -> Option<usize> {
    let mut i = start;
    while matches!(bytes.get(i), Some(b' ' | b'\t')) {
        i += 1;
    }
    if bytes.get(i) != Some(&b'\\') {
        return None;
    }
    i += 1;
    while matches!(bytes.get(i), Some(b' ' | b'\t')) {
        i += 1;
    }
    if matches!(bytes.get(i), Some(b'\n' | b'\r')) {
        Some(i - start)
    } else {
        None
    }
}

/// Sniff the most likely delimiter by counting occurrences in the first two
/// logical lines (up to 2 KB). The delimiter with the highest and consistent
/// count wins; defaults to comma when inconclusive.
///
/// **Caveat:** counts raw byte occurrences — may misfire if the first two lines
/// contain delimiter characters inside quoted fields.
fn sniff_delimiter(bytes: &[u8]) -> u8 {
    let sample = bytes.get(..2048).unwrap_or(bytes);

    // Collect up to the first two lines (CRLF or LF).
    let mut lines: Vec<&[u8]> = Vec::with_capacity(2);
    let mut start = 0;
    for (i, &b) in sample.iter().enumerate() {
        if b == b'\n' {
            let end = if i > 0 && sample.get(i - 1) == Some(&b'\r') {
                i - 1
            } else {
                i
            };
            if let Some(slice) = sample.get(start..end) {
                lines.push(slice);
            }
            start = i + 1;
            if lines.len() == 2 {
                break;
            }
        }
    }
    // If there was content after the last newline (or no newline), include it.
    if lines.len() < 2
        && start < sample.len()
        && let Some(slice) = sample.get(start..)
    {
        lines.push(slice);
    }

    let delimiters: &[u8] = b",;\t";

    let mut best: u8 = b',';
    let mut best_count: usize = 0;

    for &delim in delimiters {
        let counts: Vec<usize> = lines
            .iter()
            .map(|line| line.iter().filter(|&&b| b == delim).count())
            .collect();

        let first = counts.first().copied().unwrap_or(0);
        if first == 0 {
            continue;
        }

        // "Consistent" means all sampled lines agree on the same count.
        let consistent = counts.iter().all(|&c| c == first);
        if consistent && first > best_count {
            best_count = first;
            best = delim;
        }
    }

    best
}

/// Parse a row record from the csv reader into a `BTreeMap<header, Option<value>>`.
fn record_to_map(
    headers: &[String],
    record: &csv::StringRecord,
) -> BTreeMap<String, Option<String>> {
    headers
        .iter()
        .zip(record.iter())
        .map(|(header, cell)| {
            let value = if cell.is_empty() || cell == r"\N" {
                None
            } else {
                Some(cell.to_owned())
            };
            (header.clone(), value)
        })
        .collect()
}

/// Build a CSV reader and validated header list from raw bytes.
///
/// Handles BOM stripping, delimiter sniffing, empty-header detection, and
/// duplicate-header detection. Both [`parse_preview`] and [`parse_all`] delegate
/// to this helper so the setup logic is not duplicated.
fn build_reader_and_headers(
    bytes: &[u8],
) -> Result<(csv::Reader<Cursor<Vec<u8>>>, Vec<String>), CsvParseError> {
    let bytes = strip_bom(bytes);
    let delimiter = sniff_delimiter(bytes);
    let bytes = normalize_legacy_escapes(bytes, delimiter);

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .from_reader(Cursor::new(bytes));

    let raw_headers = rdr
        .headers()
        .map_err(|e| CsvParseError::Parse(e.to_string()))?;

    if raw_headers.is_empty() {
        return Err(CsvParseError::EmptyHeader);
    }

    let headers: Vec<String> = raw_headers.iter().map(str::to_owned).collect();

    let mut seen = std::collections::HashSet::new();
    for h in &headers {
        if !seen.insert(h.as_str()) {
            return Err(CsvParseError::DuplicateHeader(h.clone()));
        }
    }

    Ok((rdr, headers))
}

/// Parse the CSV bytes and return headers + up to 20 preview rows + total row count.
///
/// Handles UTF-8 BOM, delimiter sniffing (comma / semicolon / tab), and duplicate
/// header detection.
pub fn parse_preview(bytes: &[u8]) -> Result<ParsedCsvPreview, CsvParseError> {
    let (mut rdr, headers) = build_reader_and_headers(bytes)?;

    let mut preview_rows: Vec<BTreeMap<String, Option<String>>> = Vec::new();
    let mut total_rows: usize = 0;

    for result in rdr.records() {
        let record = result.map_err(|e| CsvParseError::Parse(e.to_string()))?;
        if total_rows < PREVIEW_LIMIT {
            preview_rows.push(record_to_map(&headers, &record));
        }
        total_rows += 1;
    }

    Ok(ParsedCsvPreview {
        headers,
        preview_rows,
        total_rows,
    })
}

/// Parse all rows from the CSV bytes and return them as a `Vec` of maps.
///
/// Same BOM / delimiter / duplicate-header handling as [`parse_preview`].
pub fn parse_all(bytes: &[u8]) -> Result<Vec<BTreeMap<String, Option<String>>>, CsvParseError> {
    let (mut rdr, headers) = build_reader_and_headers(bytes)?;

    let mut rows = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| CsvParseError::Parse(e.to_string()))?;
        rows.push(record_to_map(&headers, &record));
    }

    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::{parse_all, parse_preview};
    use std::path::Path;

    #[test]
    fn parse_all_accepts_legacy_backslash_before_closing_quote() {
        let csv = br#"title,description,planning
Uberdope,"Paar jaar weg, geen vakantie,
\",wo 06.03
"#;

        let rows = parse_all(csv).expect("legacy CSV should parse");

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["title"], Some("Uberdope".to_owned()));
        assert_eq!(
            rows[0]["description"],
            Some("Paar jaar weg, geen vakantie,\n".to_owned())
        );
        assert_eq!(rows[0]["planning"], Some("wo 06.03".to_owned()));
    }

    #[test]
    fn parse_all_removes_legacy_backslash_only_spacing_lines() {
        let csv = b"title,description\nHamlet,\"first\n\\   \nsecond\"\n";

        let rows = parse_all(csv).expect("legacy CSV should parse");

        assert_eq!(rows[0]["description"], Some("first\nsecond".to_owned()));
    }

    #[test]
    fn parse_all_treats_legacy_null_marker_as_empty_cell() {
        let csv = br#"title,genre
Waiting For Giraffes,\N
"#;

        let rows = parse_all(csv).expect("legacy CSV should parse");

        assert_eq!(rows[0]["title"], Some("Waiting For Giraffes".to_owned()));
        assert_eq!(rows[0]["genre"], None);
    }

    #[test]
    fn parse_all_accepts_local_legacy_csvs_when_present() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap();
        let files = [
            ("Productions - output.csv", 6_000),
            ("Events - voorstellingen.csv", 10_000),
        ];

        for (filename, minimum_rows) in files {
            let path = root.join(filename);
            if !path.exists() {
                continue;
            }

            let bytes = std::fs::read(&path).expect("read local legacy CSV fixture");
            let rows = parse_all(&bytes).expect("local legacy CSV should parse");
            assert!(
                rows.len() >= minimum_rows,
                "{filename} parsed too few rows: {}",
                rows.len()
            );
            assert!(
                rows.iter().all(|row| !row.is_empty()),
                "{filename} produced an empty row map"
            );
        }
    }

    #[test]
    fn parse_preview_accepts_local_legacy_productions_when_present() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap();
        let path = root.join("Productions - output.csv");
        if !path.exists() {
            return;
        }

        let bytes = std::fs::read(&path).expect("read local legacy productions CSV fixture");
        let preview = parse_preview(&bytes).expect("local legacy productions CSV should preview");

        assert_eq!(
            preview.headers,
            vec![
                "Titel",
                "Ondertitel",
                "Description1",
                "Description2",
                "Genre",
                "ID",
                "Planning ID",
            ]
        );
        assert_eq!(preview.preview_rows.len(), 20);
        assert!(preview.total_rows >= 6_000);
    }
}
