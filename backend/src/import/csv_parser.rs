use std::collections::BTreeMap;

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
    #[error("CSV has no data rows")]
    NoRows,
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

/// Sniff the most likely delimiter by counting occurrences in the first two
/// logical lines (up to 2 KB). The delimiter with the highest and consistent
/// count wins; defaults to comma when inconclusive.
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
    if lines.len() < 2 && start < sample.len()
        && let Some(slice) = sample.get(start..)
    {
        lines.push(slice);
    }

    let delimiters: &[(u8, &str)] = &[(b',', ","), (b';', ";"), (b'\t', "\t")];

    let mut best: u8 = b',';
    let mut best_count: usize = 0;

    for &(delim, _) in delimiters {
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
            let value = if cell.is_empty() {
                None
            } else {
                Some(cell.to_owned())
            };
            (header.clone(), value)
        })
        .collect()
}

/// Parse the CSV bytes and return headers + up to 20 preview rows + total row count.
///
/// Handles UTF-8 BOM, delimiter sniffing (comma / semicolon / tab), and duplicate
/// header detection.
pub fn parse_preview(bytes: &[u8]) -> Result<ParsedCsvPreview, CsvParseError> {
    let bytes = strip_bom(bytes);
    let delimiter = sniff_delimiter(bytes);

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .from_reader(bytes);

    // Read headers
    let raw_headers = rdr
        .headers()
        .map_err(|e| CsvParseError::Parse(e.to_string()))?;

    if raw_headers.is_empty() {
        return Err(CsvParseError::EmptyHeader);
    }

    let headers: Vec<String> = raw_headers.iter().map(str::to_owned).collect();

    // Detect duplicate headers
    let mut seen = std::collections::HashSet::new();
    for h in &headers {
        if !seen.insert(h.as_str()) {
            return Err(CsvParseError::DuplicateHeader(h.clone()));
        }
    }

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
    let bytes = strip_bom(bytes);
    let delimiter = sniff_delimiter(bytes);

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .from_reader(bytes);

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

    let mut rows = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| CsvParseError::Parse(e.to_string()))?;
        rows.push(record_to_map(&headers, &record));
    }

    Ok(rows)
}
