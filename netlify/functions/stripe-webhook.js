// netlify/functions/stripe-webhook.js
//
// Stripe kaller denne funksjonen automatisk nar en betaling er fullført.
// Vi verifiserer at kallet faktisk kommer fra Stripe (signatur-sjekk),
// og sender deretter en e-post til Ahmed med bestillingsdetaljene.
//
// OPPSETT (gjor dette i Stripe Dashboard etter deploy):
// 1. Developers -> Webhooks -> Add endpoint
// 2. URL: https://onprint.no/.netlify/functions/stripe-webhook
// 3. Velg event: checkout.session.completed
// 4. Kopier "Signing secret" inn i Netlify env-variabel STRIPE_WEBHOOK_SECRET

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFY_EMAIL = process.env.ORDER_NOTIFY_EMAIL || 'ahmed@onprint.no';

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signatur-feil:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const meta = session.metadata || {};
    const kroner = (ore) => (Number(ore) / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2 });

    try {
      await resend.emails.send({
        from: 'OnPrint Bestillinger <bestilling@onprint.no>',
        to: NOTIFY_EMAIL,
        subject: `Ny bestilling: ${meta.productId || 'produkt'} (${meta.quantity || '?'} stk)`,
        html: `
          <h2>Ny bestilling mottatt</h2>
          <p><strong>Produkt:</strong> ${meta.productId}</p>
          <p><strong>Variant:</strong> ${meta.variant}</p>
          <p><strong>Antall:</strong> ${meta.quantity} stk</p>
          <p><strong>Totalt betalt (inkl. mva):</strong> ${kroner(meta.totalIncVat)} kr</p>
          <p><strong>Kunde-e-post:</strong> ${session.customer_details?.email || session.customer_email || 'ikke oppgitt'}</p>
          <p><strong>Stripe session-ID:</strong> ${session.id}</p>
          <hr>
          <p>Sjekk Stripe Dashboard for full betalingsdetalj og eventuell filopplasting fra kunden.</p>
        `,
      });
    } catch (emailErr) {
      // Vi feiler ikke hele webhooken selv om e-posten skulle svikte -
      // Stripe har uansett registrert betalingen. Logges for oppfolging.
      console.error('Kunne ikke sende bestillings-e-post:', emailErr);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
