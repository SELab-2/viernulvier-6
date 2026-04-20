pub mod event;
pub mod production;
pub mod stub;

use serde_json::Value;

/// Extract an i32 `source_id` from a `ResolvedRow` value.
///
/// CSV cells arrive as `Value::String`; overrides may supply `Value::Number`.
/// Returns `None` if the value is missing, null, unparseable, or out of i32 range.
pub(crate) fn source_id_from_value(v: &Value) -> Option<i32> {
    let n = match v {
        Value::Number(num) => num.as_i64()?,
        Value::String(s) => s.trim().parse::<i64>().ok()?,
        _ => return None,
    };
    i32::try_from(n).ok()
}
