// netlify/functions/send-inquiry.js
//
// Tar imot generelle "be om tilbud"-forespørsler fra kontaktskjemaet
// pa forsiden (ikke direktekjøp - det handteres av create-checkout-session.js).
// Sender e-post til Ahmed med det kunden har skrevet inn.

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFY_EMAIL = process.env.ORDER_NOTIFY_EMAIL || 'ahmed@onprint.no';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    if (!data.epost || !data.fornavn) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Mangler navn eller e-post' }) };
    }

    await resend.emails.send({
      from: 'OnPrint Nettside <forespørsel@onprint.no>',
      to: NOTIFY_EMAIL,
      replyTo: data.epost,
      subject: `Ny forespørsel: ${data.tjeneste || 'Ukjent tjeneste'} - ${data.fornavn} ${data.etternavn || ''}`,
      html: `
        <h2>Ny forespørsel fra nettsiden</h2>
        <p><strong>Navn:</strong> ${data.fornavn} ${data.etternavn || ''}</p>
        <p><strong>E-post:</strong> ${data.epost}</p>
        <p><strong>Telefon:</strong> ${data.telefon || 'ikke oppgitt'}</p>
        <p><strong>Bedrift:</strong> ${data.bedrift || 'ikke oppgitt'}</p>
        <p><strong>Tjeneste:</strong> ${data.tjeneste || 'ikke valgt'}</p>
        <p><strong>Melding:</strong><br>${(data.melding || 'Ingen melding').replace(/\n/g, '<br>')}</p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-inquiry error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Kunne ikke sende forespørsel' }) };
  }
};
