### translations

**moet enkel de interface in het engels, of ook de catalogus**?

 enkel engels en nederlands, dus design space is erg simpel.
Voorgesteld:
Twee expliciete kolommen (pragmatisch)

```sql
spaces
------

id
name_nl VARCHAR
name_en VARCHAR
created_at
updated_at

```

API handling:
ofwel URL prefix `/nl/...` of Accept-Language header
