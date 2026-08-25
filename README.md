# OnPrint.no - full nettside (frontend + backend)

Bygget fra bunnen som statisk HTML + Netlify Functions, samme stack som
toptransport.no. Design-tokene (farger, fonter, komponentstiler) er hentet
DIREKTE fra den faktiske onprint.no via live browser-inspeksjon - ikke gjettet.

## Struktur

```
public/
  index.html                    - Forsiden (hero, tjenester, pakker, priser, kontakt)
  bestilling-bekreftet.html     - Side kunden lander på etter betaling
  produkter/
    visittkort.html             - Produktside med konfigurator + Stripe checkout
  css/
    tokens.css                  - Design-tokens (farger/fonter/knapper) - kilde til sannhet
    home.css                    - Stiler spesifikt for forsiden
    shop.css                    - Stiler for produkt-/checkout-sider

netlify/functions/
  create-checkout-session.js    - Oppretter Stripe Checkout, beregner pris SERVER-SIDE
  stripe-webhook.js             - Lytter på fullført betaling, sender e-post til Ahmed
  send-inquiry.js               - Tar imot "be om tilbud"-skjemaet fra forsiden
```

## Design-tokens - hentet fra ekte onprint.no

| Token | Verdi | Hvor det brukes |
|---|---|---|
| Display-font | Barlow Condensed, vekt 900, italic | Hero-overskrift, pakke-titler, priser |
| Seksjonsoverskrift-font | Playfair Display | H2-er, produktkort-titler |
| Body-font | Inter | All løpende tekst / UI |
| Aksentfarge | `#00c4e0` (cyan) | Knapper, lenker, badges |
| Mørk hero-bakgrunn | `#111111` | Hero-seksjon, header |
| Footer-bakgrunn | `#080f17` | Footer |
| Lys seksjonsbakgrunn | `#f0f8fc` | Tjenester/priser-seksjoner |
| Knapp-radius | `2px` | Skarpe, nesten firkantede knapper |

Alt dette kan justeres i `public/css/tokens.css` hvis Ahmed sender deg faktisk
kildekode senere - da er det én fil å oppdatere, resten arver automatisk.

## Oppsett for at betaling og e-post skal virke

### 1. Stripe
1. Opprett/logg inn på stripe.com
2. Aktiver Klarna: Settings -> Payment methods
3. Aktiver Apple Pay: Settings -> Payment methods -> Apple Pay, verifiser domenet onprint.no
4. Hent API-nøkler: dashboard.stripe.com/apikeys

### 2. Resend (e-postutsendelse)
1. Opprett konto på resend.com
2. Verifiser domenet onprint.no (DNS-oppsett samme sted dere administrerer domenet)
3. Hent API-nøkkel

### 3. Netlify environment variables
Legg inn alle variablene fra `.env.example` med ekte verdier under
Site settings -> Environment variables i Netlify.

### 4. Stripe webhook (etter første deploy)
1. Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
2. URL: `https://onprint.no/.netlify/functions/stripe-webhook`
3. Event: `checkout.session.completed`
4. Kopier "Signing secret" inn som `STRIPE_WEBHOOK_SECRET` i Netlify

### 5. Test lokalt
```
npm install
netlify dev
```
Bruk Stripe testkort (4242 4242 4242 4242) for å teste uten å belaste ekte kort.

## Ting som gjenstår / må avklares med Ahmed

- [ ] Faktisk leveringstid per produkt (nå: placeholder "3-5 virkedager")
- [ ] Ekte produktbilder (nå: fargeplaceholder)
- [ ] Ekte logo-fil (nå: tekstlogo "ON PRINT")
- [ ] Faktisk telefonnummer og adresse - bekreftet fra footer på siden, men dobbeltsjekk
- [ ] Filopplasting - skal kunden kunne laste opp eget design/logo ved bestilling?
      (ikke bygget ennå - krever fillagring, f.eks. Cloudinary eller Netlify Blobs)
- [ ] Hvilke flere produkter skal ha samme direktekjøp-flyt (brosjyrer, gatebukk,
      roll-up, canvas - alle har allerede fastpris i prislisten på siden)
- [ ] "Bil"-seksjonen fra onprint.no (bildekor/foliering) er ikke bygget som egen
      seksjon ennå - trengs det på forsiden også, eller holder tjenestekortet?
