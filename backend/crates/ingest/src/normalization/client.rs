use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;

use super::prompt::{ChatMessage, Role};

#[derive(Debug, Error)]
pub enum LlmError {
    #[error("LLM request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("LLM returned status {status}: {body}")]
    Status { status: u16, body: String },
    #[error("LLM response was not valid JSON: {0}")]
    Decode(String),
    #[error("LLM response missing content field")]
    MissingContent,
}

pub struct GroqClient {
    http: reqwest::Client,
    base_url: String,
    api_key: String,
    model: String,
}

impl GroqClient {
    pub fn new(api_key: String, model: String, base_url: String) -> Result<Self, LlmError> {
        let http = reqwest::Client::builder()
            .user_agent("viernulvier-normalizer")
            .timeout(Duration::from_secs(30))
            .build()?;
        Ok(Self {
            http,
            base_url,
            api_key,
            model,
        })
    }

    pub async fn complete_json(&self, messages: Vec<ChatMessage>) -> Result<String, LlmError> {
        let url = format!("{}/chat/completions", self.base_url);

        let body = GroqChatBody {
            model: &self.model,
            messages: messages
                .iter()
                .map(|m| WireMessage {
                    role: role_str(m.role),
                    content: &m.content,
                })
                .collect(),
            response_format: json!({ "type": "json_object" }),
        };

        tracing::debug!(url = %url, "sending LLM request");

        let response = self
            .http
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(LlmError::Status {
                status: status.as_u16(),
                body,
            });
        }

        let parsed: GroqCompletionResponse = response
            .json()
            .await
            .map_err(|e| LlmError::Decode(e.to_string()))?;

        parsed
            .choices
            .into_iter()
            .next()
            .and_then(|c| c.message.content)
            .ok_or(LlmError::MissingContent)
    }
}

#[derive(Debug, Deserialize)]
struct GroqCompletionResponse {
    choices: Vec<GroqChoice>,
}

#[derive(Debug, Deserialize)]
struct GroqChoice {
    message: GroqMessage,
}

#[derive(Debug, Deserialize)]
struct GroqMessage {
    content: Option<String>,
}

#[derive(Debug, Serialize)]
struct GroqChatBody<'a> {
    model: &'a str,
    messages: Vec<WireMessage<'a>>,
    response_format: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct WireMessage<'a> {
    role: &'a str,
    content: &'a str,
}

fn role_str(role: Role) -> &'static str {
    match role {
        Role::System => "system",
        Role::User => "user",
        Role::Assistant => "assistant",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn client_for(server: &MockServer) -> GroqClient {
        GroqClient::new("test-key".into(), "test-model".into(), server.uri()).unwrap()
    }

    #[tokio::test]
    async fn request_uses_bearer_and_json_mode() {
        let server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(header("authorization", "Bearer test-key"))
            .and(header("content-type", "application/json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "choices": [{"message": {"content": "{\"ok\":true}"}}]
            })))
            .expect(1)
            .mount(&server)
            .await;

        let client = client_for(&server);
        let body = client
            .complete_json(vec![ChatMessage::user("hi")])
            .await
            .unwrap();
        assert_eq!(body, "{\"ok\":true}");
    }

    #[tokio::test]
    async fn non_2xx_surfaces_as_status_error() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(429).set_body_string("rate limited"))
            .mount(&server)
            .await;

        let client = client_for(&server);
        let err = client
            .complete_json(vec![ChatMessage::user("x")])
            .await
            .unwrap_err();
        match err {
            LlmError::Status { status, body } => {
                assert_eq!(status, 429);
                assert_eq!(body, "rate limited");
            }
            other => panic!("expected Status error, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn missing_content_is_reported() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({"choices": []})))
            .mount(&server)
            .await;

        let client = client_for(&server);
        let err = client
            .complete_json(vec![ChatMessage::user("x")])
            .await
            .unwrap_err();
        assert!(matches!(err, LlmError::MissingContent));
    }

    #[tokio::test]
    async fn system_and_user_roles_serialize_correctly() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(wiremock::matchers::body_partial_json(json!({
                "messages": [
                    {"role": "system", "content": "be brief"},
                    {"role": "user",   "content": "hello"}
                ]
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "choices": [{"message": {"content": "{}"}}]
            })))
            .expect(1)
            .mount(&server)
            .await;

        let client = client_for(&server);
        client
            .complete_json(vec![
                ChatMessage::system("be brief"),
                ChatMessage::user("hello"),
            ])
            .await
            .unwrap();
    }
}
