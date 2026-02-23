# Contact Formulier - Netlify Setup

## Wat is actief

- Contactpagina op `/pages/contact.html`
- Client-side validatie in `/js/contact.js`
- Verzending via Netlify Forms (geen PHP)
- Honeypot spamfilter via `bot-field`

## Hoe het werkt

1. Gebruiker vult het formulier in op `/pages/contact.html`.
2. JavaScript valideert de velden.
3. Bij submit gaat een POST naar `/` met urlencoded form data.
4. Netlify Forms vangt de submission op.

## Vereiste form-config

De form moet deze attributen hebben:

```html
<form
  id="contact-form"
  class="contact-form"
  name="contact"
  method="POST"
  action="/"Z
  data-netlify="true"
  netlify-honeypot="bot-field"
>
  <input type="hidden" name="form-name" value="contact">
</form>
```

## Productie checklist

1. Push naar Netlify (deploy moet slagen).
2. Open de contactpagina 1 keer na deploy zodat Netlify de form detecteert.
3. Verstuur een testbericht.
4. Check submissions in Netlify Dashboard:
   Site -> Forms -> `contact`

## Troubleshooting

### Form submissions komen niet binnen

- Controleer of `name="contact"` en hidden `form-name` exact overeenkomen.
- Controleer of `data-netlify="true"` op de form staat.
- Controleer of de deploy de nieuwste `pages/contact.html` bevat.

### Client-side submit faalt

- Controleer browser console voor netwerkfouten.
- Controleer of `js/contact.js` geladen wordt op de pagina.

## Opmerking

- `api/` bevat geen actieve PHP handlers meer.
- Als je later e-mail forwarding wil, regel dat via Netlify Forms notifications of een webhook.

---

**Laatst bijgewerkt:** 22 februari 2026
