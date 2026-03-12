#[utoipa::path(
    method(get),
    path = "/version",
    tag = "System",
    operation_id = "get_build_version",
    description = "Get server build version",
    responses(
        (status = 200, description = "Success", body = String)
    )
)]
#[allow(clippy::unused_async)]
pub async fn get() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
