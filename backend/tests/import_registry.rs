use viernulvier_archive::import::default_registry;

#[test]
fn default_registry_exposes_all_entity_types() {
    let reg = default_registry();
    let mut supported = reg.supported();
    supported.sort();
    assert_eq!(
        supported,
        vec!["article", "artist", "event", "location", "production"]
    );
}

#[test]
fn default_registry_returns_production_adapter() {
    let reg = default_registry();
    let adapter = reg.get("production").expect("production registered");
    assert_eq!(adapter.entity_type(), "production");
    assert!(!adapter.target_fields().is_empty());
}

#[test]
fn default_registry_returns_event_adapter() {
    let reg = default_registry();
    let adapter = reg.get("event").expect("event registered");
    assert_eq!(adapter.entity_type(), "event");
    assert_eq!(adapter.target_fields().len(), 5);
}

#[test]
fn default_registry_returns_stub_for_unsupported_entities() {
    let reg = default_registry();
    for name in ["article", "location", "artist"] {
        let adapter = reg.get(name).expect("stub registered");
        assert_eq!(adapter.entity_type(), name);
        assert!(adapter.target_fields().is_empty());
    }
}

#[test]
fn stub_validate_row_returns_not_supported_warning() {
    let reg = default_registry();
    let adapter = reg.get("article").expect("article stub");
    let warnings = adapter.validate_row(&std::collections::BTreeMap::new());
    assert_eq!(warnings.len(), 1);
    assert_eq!(warnings[0].code, "not_supported");
}
