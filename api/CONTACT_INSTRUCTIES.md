# Contact Formulier - Setup Instructies

## Wat is toegevoegd?

✅ Professionele contact pagina met formulier  
✅ Real-time validatie op alle velden  
✅ Mooie styling met groene accent kleuren  
✅ Responsive design (werkt op alle schermen)  
✅ Spam-bescherming en rate limiting  
✅ Contact link in alle navigaties

## Hoe werkt het?

1. **Voor de gebruiker:**
   - Vult formulier in op `/pages/contact.html`
   - Gets real-time feedback bij fouten
   - Klikt "Verstuur bericht"
   - Ziet bevestigingsmelding

2. **Achter de schermen:**
   - JavaScript valideert alle velden
   - Formulier wordt via AJAX verzonden naar PHP
   - PHP checker input opnieuw + voorkomt spam
   - E-mail wordt verstuurd naar `drukkerij.devlieghere@skynet.be`

## Setup voor productie

### Stap 1: E-mailadres aanpassen (optioneel)

Open `contact-handler.php` en pas deze regel aan als je een ander e-mailadres wil:

```php
$toEmail = 'drukkerij.devlieghere@skynet.be'; // Wijzig hier
```

### Stap 2: Domeinnaam toevoegen

In `contact-handler.php`, regel 9, voeg je productie domein toe:

```php
$allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://www.jouweigendomein.be' // VOEG DIT TOE
];
```

### Stap 3: Upload naar server

Upload deze bestanden:
- `/pages/contact.html`
- `/css/contact.css`
- `/js/contact.js`
- `/api/contact-handler.php`

**Let op:** Je server moet PHP en `mail()` functie ondersteunen.

### Stap 4: Test het formulier

1. Ga naar je website/contact.html
2. Vul formulier in
3. Check of je e-mail ontvangt

## Troubleshooting

### E-mails komen niet aan

**Mogelijke oorzaken:**
1. Server ondersteunt geen `mail()` functie
2. E-mails komen in spam terecht
3. Server firewall blokkeert uitgaande mail

**Oplossingen:**
- Check met je hosting provider of mail() werkt
- Gebruik alternatieven zoals:
  - **Formspree.io** (gratis, geen PHP nodig)
  - **EmailJS** (gratis, client-side)
  - **SendGrid SMTP** (via PHP library)

### Formspree.io alternatief (AANBEVOLEN)

Als `mail()` niet werkt, gebruik Formspree:

1. Ga naar https://formspree.io
2. Maak gratis account aan
3. Maak nieuw formulier
4. Kopieer de form endpoint URL
5. Open `/pages/contact.html`, lijn 84:
   ```html
   <form id="contact-form" class="contact-form" method="POST" action="https://formspree.io/f/JOUWID">
   ```
6. Verwijder of negeer `api/contact-handler.php`

Klaar! Werkt zonder PHP configuratie.

## Features

✅ **Validatie:**
- Naam minimaal 2 karakters
- Geldig e-mailadres
- Onderwerp minimaal 3 karakters
- Bericht minimaal 10 karakters

✅ **Beveiliging:**
- Rate limiting (max 1 bericht per minuut)
- Spam keyword detectie
- Input sanitization
- XSS bescherming

✅ **UX:**
- Real-time feedback
- Loading state tijdens verzenden
- Duidelijke success/error meldingen
- Auto-scroll naar meldingen

## Design

De contact pagina heeft:
- Groene info box links met contactgegevens
- Wit formulier rechts
- Consistent met rest van de site
- Mobile friendly (stapelt verticaal op klein scherm)

---

**Gemaakt door:** Siemen  
**Laatst bijgewerkt:** 22 februari 2026
