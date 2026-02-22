# Klassement Updaten - Instructies

## Hoe werk je het klassement bij?

Het klassement wordt beheerd via het bestand: `data/klassement.json`

### Stappen om te updaten:

1. Open het bestand `data/klassement.json` in een teksteditor (Notepad, VS Code, etc.)

2. Update de statistieken voor elk team:
   - `position`: Positie in het klassement (1, 2, 3...)
   - `team`: Naam van het team (laat ongewijzigd)
   - `played`: Aantal gespeelde wedstrijden
   - `won`: Aantal gewonnen wedstrijden
   - `draw`: Aantal gelijke spelen
   - `lost`: Aantal verloren wedstrijden
   - `goalsFor`: Aantal gemaakte doelpunten
   - `goalsAgainst`: Aantal tegendoelpunten
   - `points`: Totaal aantal punten

3. Update de `lastUpdated` datum bovenaan naar vandaag (formaat: `YYYY-MM-DD`)

4. Sla het bestand op

5. Upload het bestand naar je server (vervang het oude bestand)

6. De website toont nu automatisch het nieuwe klassement

### Voorbeeld:

```json
{
  "lastUpdated": "2026-02-22",
  "teams": {
    "68": [
      {
        "position": 1,
        "team": "VK Ettelgem 68",
        "played": 18,
        "won": 14,
        "draw": 2,
        "lost": 2,
        "goalsFor": 68,
        "goalsAgainst": 24,
        "points": 44
      }
    ]
  }
}
```

### Tips:

- Let op komma's tussen items (laatste item heeft GEEN komma)
- Houd de structuur exact hetzelfde
- Controleer of het bestand nog geldig JSON is (test op jsonlint.com)
- Update minimaal 1x per week na de laatste wedstrijden

### Problemen?

Als het klassement niet verschijnt:
1. Check of het JSON bestand correct is opgeslagen
2. Controleer de browser console (F12) voor foutmeldingen
3. Ververs de pagina met Ctrl+F5 (hard refresh)

---

**Gemaakt door:** Siemen
**Laatst bijgewerkt:** 22 februari 2026
