#![allow(clippy::indexing_slicing)]

use viernulvier_archive::import::csv_parser::{CsvParseError, parse_all, parse_preview};

// ---------------------------------------------------------------------------
// parse_preview tests
// ---------------------------------------------------------------------------

#[test]
fn parse_preview_basic() {
    let csv = b"a,b\n1,2\n3,4";
    let result = parse_preview(csv).unwrap();
    assert_eq!(result.headers, vec!["a", "b"]);
    assert_eq!(result.preview_rows.len(), 2);
    assert_eq!(result.total_rows, 2);
    assert_eq!(result.preview_rows[0]["a"], Some("1".to_owned()));
    assert_eq!(result.preview_rows[0]["b"], Some("2".to_owned()));
    assert_eq!(result.preview_rows[1]["a"], Some("3".to_owned()));
    assert_eq!(result.preview_rows[1]["b"], Some("4".to_owned()));
}

#[test]
fn parse_preview_with_bom() {
    // UTF-8 BOM prepended
    let csv = b"\xef\xbb\xbfa,b\n1,2".to_vec();
    // Ensure the BOM is at the start
    assert_eq!(&csv[..3], b"\xef\xbb\xbf");
    let result = parse_preview(&csv).unwrap();
    // First header must NOT contain the BOM character
    assert_eq!(result.headers[0], "a");
    assert_eq!(result.headers[1], "b");
}

#[test]
fn parse_preview_crlf() {
    let csv = b"a,b\r\n1,2\r\n3,4";
    let result = parse_preview(csv).unwrap();
    assert_eq!(result.headers, vec!["a", "b"]);
    assert_eq!(result.total_rows, 2);
    assert_eq!(result.preview_rows[0]["a"], Some("1".to_owned()));
}

#[test]
fn parse_preview_quoted_comma() {
    let csv = b"a,b\n\"hello, world\",1";
    let result = parse_preview(csv).unwrap();
    assert_eq!(result.preview_rows[0]["a"], Some("hello, world".to_owned()));
    assert_eq!(result.preview_rows[0]["b"], Some("1".to_owned()));
}

#[test]
fn parse_preview_empty_trailing_line() {
    // Trailing newline must not produce an extra row
    let csv = b"a,b\n1,2\n";
    let result = parse_preview(csv).unwrap();
    assert_eq!(result.total_rows, 1);
    assert_eq!(result.preview_rows.len(), 1);
}

#[test]
fn parse_preview_limits_to_20() {
    // Build 25 data rows
    let mut csv = String::from("a,b\n");
    for i in 0..25 {
        csv.push_str(&format!("{i},val\n"));
    }
    let result = parse_preview(csv.as_bytes()).unwrap();
    assert_eq!(result.total_rows, 25);
    assert_eq!(result.preview_rows.len(), 20);
}

#[test]
fn parse_preview_empty_cells_become_none() {
    let csv = b"a,b\n1,\n,2";
    let result = parse_preview(csv).unwrap();
    // row 0: a=Some("1"), b=None
    assert_eq!(result.preview_rows[0]["a"], Some("1".to_owned()));
    assert_eq!(result.preview_rows[0]["b"], None);
    // row 1: a=None, b=Some("2")
    assert_eq!(result.preview_rows[1]["a"], None);
    assert_eq!(result.preview_rows[1]["b"], Some("2".to_owned()));
}

#[test]
fn parse_preview_semicolon_delimited() {
    let csv = b"a;b\n1;2\n3;4";
    let result = parse_preview(csv).unwrap();
    assert_eq!(result.headers, vec!["a", "b"]);
    assert_eq!(result.total_rows, 2);
    assert_eq!(result.preview_rows[0]["a"], Some("1".to_owned()));
    assert_eq!(result.preview_rows[0]["b"], Some("2".to_owned()));
}

#[test]
fn parse_preview_rejects_empty_header() {
    let csv = b"";
    let err = parse_preview(csv).unwrap_err();
    assert!(
        matches!(err, CsvParseError::EmptyHeader | CsvParseError::Parse(_)),
        "expected EmptyHeader or Parse error, got: {err}"
    );
}

#[test]
fn parse_preview_rejects_duplicate_headers() {
    let csv = b"a,a\n1,2";
    let err = parse_preview(csv).unwrap_err();
    assert!(
        matches!(err, CsvParseError::DuplicateHeader(ref h) if h == "a"),
        "expected DuplicateHeader(\"a\"), got: {err}"
    );
}

#[test]
fn parse_preview_legacy_productions_header() {
    // Actual header from the VierNulVier legacy CSV export
    let csv = b"Titel,Ondertitel,Description1,Description2,Genre,ID,Planning ID\n";
    let result = parse_preview(csv).unwrap();
    assert_eq!(
        result.headers,
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
    assert_eq!(result.total_rows, 0);
}

// ---------------------------------------------------------------------------
// parse_all tests
// ---------------------------------------------------------------------------

#[test]
fn parse_all_basic() {
    let csv = b"a,b\n1,2\n3,4";
    let rows = parse_all(csv).unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0]["a"], Some("1".to_owned()));
    assert_eq!(rows[0]["b"], Some("2".to_owned()));
    assert_eq!(rows[1]["a"], Some("3".to_owned()));
    assert_eq!(rows[1]["b"], Some("4".to_owned()));
}
