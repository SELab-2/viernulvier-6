pub enum InternalStateKey {
    LastApiUpdate,
}

impl InternalStateKey {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::LastApiUpdate => "last_api_update",
        }
    }
}
