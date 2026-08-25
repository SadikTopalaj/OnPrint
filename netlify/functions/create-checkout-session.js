// netlify/functions/create-checkout-session.js
//
// Oppretter en Stripe Checkout Session. Kunden sendes til Stripes
// hostede betalingsside, som automatisk viser kort, Apple Pay og
// Klarna (satt opp i Stripe Dashboard -> Payment methods).
//
// VIKTIG SIKKERHETSPRINSIPP: Vi stoler ALDRI paa pris som kommer fra
// frontend/nettleseren. Kunden kan aapne devtools og endre en pris i
// JavaScript. Derfor slaar denne funksjonen opp riktig pris server-side
// basert paa produkt-ID og valgt variant/antall - akkurat som en
// butikk-kasse slaar opp strekkoden i stedet for aa stole paa hva
// kunden sier varen koster.

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// --- Produktkatalog (server-side "sannhet") ------------------------------
// Priser hentet fra onprint.no sin prisliste. Eks. mva. Oppdater her
// naar Ahmed endrer priser - IKKE bare i frontend-HTML.
const PRODUCTS = {
  visittkort: {
    name: 'Visittkort',
    // pris i ore (Stripe bruker minste myntenhet), eks mva
    prices: {
      '1-sidig': {
        200: 60000, 300: 66500, 500: 81000,
        1000: 119000, 2500: 239300, 5000: 297000,
      },
      '2-sidig': {
        200: 70000, 300: 76000, 500: 93600,
        1000: 144500, 2500: 280500, 5000: 344300,
      },
    },
    // Placeholder - bekreft faktisk leveringstid med Ahmed
    deliveryEstimate: '3-5 virkedager',
  },
};

const VAT_RATE = 0.25; // norsk mva-sats

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { productId, variant, quantity, customerEmail } = JSON.parse(event.body);

    const product = PRODUCTS[productId];
    if (!product) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Ukjent produkt' }) };
    }

    const priceTable = product.prices[variant];
    if (!priceTable) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Ukjent variant' }) };
    }

    const totalExVat = priceTable[quantity];
    if (totalExVat === undefined) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig antall' }) };
    }

    const totalIncVat = Math.round(totalExVat * (1 + VAT_RATE));
    const siteUrl = process.env.URL || 'http://localhost:8888';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'klarna'],
      // Apple Pay krever ikke egen payment_method_type - den vises
      // automatisk i "card"-flyten paa stottede Apple-enheter/nettlesere
      // saa lenge domenet er verifisert i Stripe Dashboard.
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'nok',
            unit_amount: totalIncVat,
            product_data: {
              name: `${product.name} - ${variant}, ${quantity} stk`,
              description: `Inkl. 25% mva. Estimert leveringstid: ${product.deliveryEstimate}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        productId,
        variant,
        quantity: String(quantity),
        totalExVat: String(totalExVat),
        totalIncVat: String(totalIncVat),
      },
      success_url: `${siteUrl}/bestilling-bekreftet.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/produkter/visittkort.html`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke opprette betaling. Prøv igjen.' }) };
  }
};
