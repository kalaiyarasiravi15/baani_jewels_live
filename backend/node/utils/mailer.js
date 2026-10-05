const nodemailer = require('nodemailer');
require('../config/envLoader');

// Shared by account, admin, order, contact and newsletter emails.
let cachedTransport = null;
let lastCredsKey = '';

function getTransport(env = process.env) {
    const host = String(env.SMTP_HOST || '').trim();
    const service = String(env.SMTP_SERVICE || 'gmail').trim();
    const gmail = host ? host === 'smtp.gmail.com' : service.toLowerCase() === 'gmail';
    const port = Number(env.SMTP_PORT || 465);
    const user = String(env.EMAIL_USER || 'Baanijewels.ind@gmail.com').trim();
    const password = String(env.EMAIL_PASS || 'zojnfrfwbzipykdb');
    const pass = gmail ? password.replace(/\s/g, '') : password;
    const credsKey = `${host}:${port}:${service}:${user}:${pass}`;

    if (!cachedTransport || lastCredsKey !== credsKey) {
        if (cachedTransport) {
            try { cachedTransport.close(); } catch (_) {}
        }
        cachedTransport = nodemailer.createTransport({
            ...(host ? { host, port, secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465 } : { service }),
            auth: { user, pass },
            dnsTimeout: 10000,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 30000
        });
        lastCredsKey = credsKey;
    }
    return cachedTransport;
}

function createMailer(env = process.env) {
    return {
        verify: (callback) => {
            const transport = getTransport(env);
            if (callback) return transport.verify(callback);
            return transport.verify();
        },
        close: () => {
            if (cachedTransport) {
                try { cachedTransport.close(); } catch (_) {}
                cachedTransport = null;
            }
        },
        async sendMail(message) {
            const user = String(env.EMAIL_USER || 'Baanijewels.ind@gmail.com').trim();
            const pass = String(env.EMAIL_PASS || 'zojnfrfwbzipykdb').trim();
            if (!user || !pass) {
                throw new Error('Email service is not configured. Set EMAIL_USER and EMAIL_PASS.');
            }
            const transport = getTransport(env);
            const mailOptions = {
                from: message.from || `"Baani Jewels" <${user}>`,
                replyTo: message.replyTo || env.SUPPORT_EMAIL || user,
                ...message
            };
            const info = await transport.sendMail(mailOptions);
            return info;
        }
    };
}

module.exports = createMailer();
module.exports.createMailer = createMailer;

