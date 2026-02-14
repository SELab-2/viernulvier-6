### Frontend

### Databank

Voor een archief met beperkte schaal zou SQLite technisch voldoende zijn. de data is grotendeels write-once/read-many en enkele honderdduizenden records zijn geen probleem. Het operationele voordeel is groot: zero configuratie, backup is één bestand kopiëren, geen database server onderhouden.

Maar dit is een agenda-applicatie waar datetime queries quasi centraal staan. Alle user stories draaien om tijdsperiodes: "producties laatste 10 jaar", "wanneer was die show in de jaren 90". In Postgres schrijf je WHERE date > NOW() - INTERVAL '10 years' en het werkt gewoon. In SQLite sla je datums op als TEXT of Unix timestamps en doe je constant handmatige conversies.

Postgres biedt daarnaast full-text search in meerdere talen, JSON columns voor flexibele metadata, en betere performance bij complexe filters. Met Supabase krijg je managed Postgres zonder operationele overhead - beste van beide werelden.
Conclusie: Postgres wint door native datetime handling die perfect past bij de use case.

### Media storage
min.io
