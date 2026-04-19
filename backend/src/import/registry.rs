use crate::import::trait_def::ImportableEntity;
use std::{collections::HashMap, sync::Arc};

#[derive(Clone)]
pub struct ImportRegistry {
    entries: Arc<HashMap<&'static str, Arc<dyn ImportableEntity>>>,
}

impl ImportRegistry {
    pub fn new(adapters: Vec<Arc<dyn ImportableEntity>>) -> Self {
        let mut map = HashMap::new();
        for adapter in adapters {
            map.insert(adapter.entity_type(), adapter);
        }
        Self {
            entries: Arc::new(map),
        }
    }

    pub fn get(&self, entity_type: &str) -> Option<Arc<dyn ImportableEntity>> {
        self.entries.get(entity_type).cloned()
    }

    pub fn supported(&self) -> Vec<&'static str> {
        self.entries.keys().copied().collect()
    }
}
