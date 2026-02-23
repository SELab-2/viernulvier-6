use reqwest::Proxy;

use crate::api::models::{collection::ApiCollection, production::Production};

pub async fn get_productions(
    auth_token: &str,
    page: u32,
) -> Result<ApiCollection<Production>, reqwest::Error> {
    let client = reqwest::Client::builder().user_agent("selab6").build()?;
    let response = client
        .get(format!(
            "https://www.viernulvier.gent/api/v1/productions?page={page}"
        ))
        .header("X-AUTH-TOKEN", auth_token)
        .send()
        .await?
        .error_for_status()?;

    let collection: ApiCollection<Production> = response.json().await?;

    dbg!(collection.members.len());
    Ok(collection)
}
