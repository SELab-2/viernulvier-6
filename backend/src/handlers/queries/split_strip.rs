pub fn split_strip(query: &str) -> Vec<String> {
    query.split(",").map(|e| e.trim().to_owned()).collect()
}
