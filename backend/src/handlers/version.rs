pub struct VersionHandler;

impl VersionHandler {
    pub async fn get() -> &'static str {
        env!("CARGO_PKG_VERSION")
    }
}
