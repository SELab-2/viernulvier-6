use std::env;

use thiserror::Error;

#[derive(Debug, Clone)]
pub struct NormalizationConfig {
    pub api_key: Option<String>,
    pub model: String,
    pub base_url: String,
    pub confidence_threshold: f32,
}

#[derive(Debug, Error)]
pub enum NormalizationConfigError {
    #[error("unsupported LLM_PROVIDER `{0}` (only `groq` is supported)")]
    UnsupportedProvider(String),
    #[error("LLM_CONFIDENCE_THRESHOLD `{0}` is not a valid float in [0.0, 1.0]")]
    InvalidThreshold(String),
}

const DEFAULT_THRESHOLD: f32 = 0.8;
const DEFAULT_MODEL: &str = "llama-3.3-70b-versatile";
const DEFAULT_BASE_URL: &str = "https://api.groq.com/openai/v1";

impl NormalizationConfig {
    pub fn from_env() -> Result<Self, NormalizationConfigError> {
        if let Some(raw) = env::var("LLM_PROVIDER").ok().filter(|s| !s.is_empty())
            && !raw.eq_ignore_ascii_case("groq")
        {
            return Err(NormalizationConfigError::UnsupportedProvider(raw));
        }

        let api_key = env::var("LLM_API_KEY").ok().filter(|s| !s.is_empty());

        let model = env::var("LLM_MODEL")
            .ok()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_MODEL.to_string());

        let base_url = env::var("LLM_BASE_URL")
            .ok()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_BASE_URL.to_string());

        let confidence_threshold = match env::var("LLM_CONFIDENCE_THRESHOLD").ok() {
            Some(raw) if !raw.is_empty() => raw
                .parse::<f32>()
                .ok()
                .filter(|v| (0.0..=1.0).contains(v))
                .ok_or(NormalizationConfigError::InvalidThreshold(raw))?,
            _ => DEFAULT_THRESHOLD,
        };

        Ok(Self {
            api_key,
            model,
            base_url,
            confidence_threshold,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // env is process-global so serialize tests that touch it.
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    struct EnvGuard(&'static [&'static str]);
    impl Drop for EnvGuard {
        fn drop(&mut self) {
            for key in self.0 {
                unsafe { env::remove_var(key) };
            }
        }
    }

    fn set(key: &str, value: &str) {
        unsafe { env::set_var(key, value) };
    }
    fn clear(key: &str) {
        unsafe { env::remove_var(key) };
    }

    const KEYS: &[&str] = &[
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_MODEL",
        "LLM_BASE_URL",
        "LLM_CONFIDENCE_THRESHOLD",
    ];

    #[test]
    fn defaults_applied_when_vars_missing() {
        let _lock = ENV_LOCK.lock().unwrap();
        let _guard = EnvGuard(KEYS);
        for k in KEYS {
            clear(k);
        }

        let cfg = NormalizationConfig::from_env().unwrap();
        assert!(cfg.api_key.is_none());
        assert_eq!(cfg.model, DEFAULT_MODEL);
        assert_eq!(cfg.base_url, DEFAULT_BASE_URL);
        assert!((cfg.confidence_threshold - DEFAULT_THRESHOLD).abs() < f32::EPSILON);
    }

    #[test]
    fn explicit_groq_is_accepted() {
        let _lock = ENV_LOCK.lock().unwrap();
        let _guard = EnvGuard(KEYS);
        set("LLM_PROVIDER", "groq");
        set("LLM_API_KEY", "sk-abc");
        set("LLM_MODEL", "llama-3.1-8b-instant");
        set("LLM_BASE_URL", "https://example.test/v1");
        set("LLM_CONFIDENCE_THRESHOLD", "0.5");

        let cfg = NormalizationConfig::from_env().unwrap();
        assert_eq!(cfg.api_key.as_deref(), Some("sk-abc"));
        assert_eq!(cfg.model, "llama-3.1-8b-instant");
        assert_eq!(cfg.base_url, "https://example.test/v1");
        assert!((cfg.confidence_threshold - 0.5).abs() < f32::EPSILON);
    }

    #[test]
    fn invalid_threshold_rejected() {
        let _lock = ENV_LOCK.lock().unwrap();
        let _guard = EnvGuard(KEYS);
        set("LLM_CONFIDENCE_THRESHOLD", "not-a-number");
        assert!(matches!(
            NormalizationConfig::from_env(),
            Err(NormalizationConfigError::InvalidThreshold(_))
        ));
    }

    #[test]
    fn non_groq_provider_rejected() {
        let _lock = ENV_LOCK.lock().unwrap();
        let _guard = EnvGuard(KEYS);
        set("LLM_PROVIDER", "openai");
        assert!(matches!(
            NormalizationConfig::from_env(),
            Err(NormalizationConfigError::UnsupportedProvider(_))
        ));
    }
}
