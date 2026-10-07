// Email helper. Sending is best-effort: a missing/invalid SendGrid key or a
// SendGrid outage must never fail a request or crash the process (unawaited
// rejections terminate Node >= 15, which is what took the demo down).
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const apiKey = process.env.sendGrid_API_KEY;
const transporter = apiKey
  ? nodemailer.createTransport(sendgridTransport({ auth: { api_key: apiKey } }))
  : null;

exports.FROM = process.env.MAIL_FROM || 'node-ecommerce@incertotech.com';

exports.send = (message) => {
  if (!transporter) {
    console.log(`[mail] sendGrid_API_KEY not set; skipping "${message.subject}" to ${message.to}`);
    return Promise.resolve();
  }
  return transporter.sendMail({ from: exports.FROM, ...message }).catch((err) => {
    console.log(`[mail] failed to send "${message.subject}" to ${message.to}: ${err.message}`);
  });
};
