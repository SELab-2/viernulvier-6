pub async fn for_entity(
    &self,
    entity_type: &str,
    entity_id: Uuid,
) -> Result<Vec<EntityTag>, DatabaseError> {
    Ok(sqlx::query_as!(
        EntityTag,
        "SELECT * FROM entity_tags WHERE entity_type = $1 AND entity_id = $2",
        entity_type,
        entity_id
    )
    .fetch_all(self.db)
    .await?)
}
