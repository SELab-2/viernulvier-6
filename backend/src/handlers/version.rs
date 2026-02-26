pub struct VersionHandler;

impl VersionHandler {
    #[allow(clippy::unused_async)]
    pub async fn get() -> &'static str {
        env!("CARGO_PKG_VERSION")
    }
}
