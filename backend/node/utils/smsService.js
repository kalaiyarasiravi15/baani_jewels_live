/**
 * Sai Techno Solutions SMS client.
 *
 * The provider receives a GET request such as:
 * /sendsms?token=...&credit=2&sender=Baani JewelsT&message=...&number=9794027778
 * Keep the token in the environment; never put it in client-side code.
 */

const http = require('http');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const DEFAULT_API_URL = 'http://sms.saitechnosolutions.net';
const DEFAULT_CREDIT_TYPE = '2';
const REQUEST_TIMEOUT_MS = Number(process.env.SMS_TIMEOUT_MS) || 10000;

const config = () => ({
    apiUrl: (process.env.SMS_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
    token: String(process.env.SMS_TOKEN || '').trim(),
    sender: String(process.env.SMS_SENDER || '').trim(),
    creditType: String(process.env.SMS_CREDIT_TYPE || DEFAULT_CREDIT_TYPE).trim()
});

const normalizePhone = (phone) => {
    let value = String(phone || '').replace(/\D/g, '');
    if (value.length === 12 && value.startsWith('91')) value = value.slice(2);
    return value.length === 10 ? value : null;
};

const maskedRecipients = (numbers) => numbers.map((number) => `******${number.slice(-4)}`).join(', ');

const makeUrl = (apiUrl, path, params) => {
    const endpoint = String(path || '').replace(/^\/+|\/+$/g, '');
    const url = new URL(`${apiUrl}/${endpoint}`);
    url.search = new URLSearchParams(params).toString();
    return url;
};

const responseAccepted = (body) => {
    const text = String(body || '').trim();
    if (!text) return false;

    // Provider errors are sometimes returned with HTTP 200.
    if (/\b(error|invalid|failed|failure|insufficient|unauthori[sz]ed|not approved|blocked|denied)\b/i.test(text)) {
        return false;
    }
    if (/\b(success|accepted|submitted|queued|sent|messageid)\b/i.test(text)) return true;
    // Some gateways return only a numeric request/message id.
    return /^\d{4,}$/.test(text);
};

const requestProvider = (url, recipientLabel, redirectCount = 0) => new Promise((resolve) => {
    if (redirectCount > 5) return resolve({ success: false, error: 'Too many SMS provider redirects' });

    const client = url.protocol === 'https:' ? https : http;
    const request = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            response.resume();
            // Resolve relative redirects against the current request. This preserves the host and protocol correctly.
            return resolve(requestProvider(new URL(response.headers.location, url), recipientLabel, redirectCount + 1));
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
            const accepted = response.statusCode >= 200 && response.statusCode < 300 && responseAccepted(body);
            if (accepted) {
                console.log(`[SMS] Provider accepted a message for ${recipientLabel}.`);
                return resolve({ success: true, statusCode: response.statusCode, response: body.trim() });
            }

            const error = body.trim() || `Provider returned HTTP ${response.statusCode}`;
            console.error(`[SMS] Provider rejected a message for ${recipientLabel}. HTTP ${response.statusCode}: ${error}`);
            return resolve({ success: false, statusCode: response.statusCode, error });
        });
    });

    request.on('timeout', () => request.destroy(new Error('SMS request timed out')));
    request.on('error', (error) => {
        console.error(`[SMS] Provider request failed for ${recipientLabel}: ${error.message}`);
        resolve({ success: false, error: error.message || 'SMS provider connection failed' });
    });
});

const sendSMS = (phone, message, creditType) => {
    const numbers = String(phone || '').split(',').map(normalizePhone).filter(Boolean);
    const body = String(message || '').trim();
    const settings = config();

    if (!numbers.length) return Promise.resolve({ success: false, error: 'No valid 10-digit recipient number supplied' });
    if (!body) return Promise.resolve({ success: false, error: 'SMS message is required' });
    if (!settings.token || !settings.sender) {
        return Promise.resolve({ success: false, error: 'SMS_TOKEN and SMS_SENDER must be configured on the server' });
    }

    const url = makeUrl(settings.apiUrl, 'sendsms', {
        token: settings.token,
        credit: creditType || settings.creditType,
        sender: settings.sender,
        message: body,
        number: numbers.join(',')
    });
    return requestProvider(url, numbers.length === 1 ? maskedRecipients(numbers) : `${numbers.length} recipients`);
};

// These strings must remain byte-for-byte aligned with the approved DLT templates.
exports.sendOtpSMS = (phone, otp) => sendSMS(
    phone,
    `Your OTP for Baani Jewelss trove login account registration is ${otp} in https://Baani Jewelsstrove.com/ This code expires in 5 minutes. Do not share it with anyone. If you didn't request this, please ignore this message`
);

exports.sendOrderConfirmedSMS = (phone, orderId, amount) => sendSMS(
    phone,
    `Thank you for shopping with Baani Jewels . Your order ${orderId} has been confirmed. Total amount: Rs ${amount}. We will notify you once it is shipped.`
);

exports.sendOrderPlacedSMS = (phone, orderId) => sendSMS(
    phone,
    `Baani Jewels: Thank you for your order. Your order ${orderId} has been successfully placed in https://Baani Jewelsstrove.com/ . We will update you once it is shipped.`
);

exports.sendOrderShippedSMS = (phone, orderId) => sendSMS(
    phone,
    `Baani Jewels: Your order ${orderId} has been shippedhttps://Baani Jewelsstrove.com/ . Track your order using the tracking details provided. Thank you for shopping with us.`
);

exports.sendWelcomeSMS = (phone) => sendSMS(
    phone,
    "Baani Jewels’s Trove: Discover our latest collection of handcrafted brass kitchenware and traditional products. Explore the new arrivals today."
);

exports.sendLoginAlertSMS = () => Promise.resolve({ success: false, error: 'No approved DLT template for login alert' });
exports.sendAccountDeletedSMS = () => Promise.resolve({ success: false, error: 'No approved DLT template for account deletion' });

exports.sendBulkSMS = async (numbers, message) => {
    const phoneList = (Array.isArray(numbers) ? numbers : String(numbers).split(','))
        .map(normalizePhone)
        .filter(Boolean);
    if (!phoneList.length) return { success: false, error: 'No valid numbers' };

    const batchSize = 500;
    const results = [];
    for (let index = 0; index < phoneList.length; index += batchSize) {
        results.push(await sendSMS(phoneList.slice(index, index + batchSize).join(','), message));
    }

    const failed = results.filter((result) => !result.success);
    return {
        success: failed.length === 0,
        total: phoneList.length,
        results,
        error: failed.length ? `${failed.length} SMS batch(es) were rejected by the provider` : undefined
    };
};

exports.checkCredits = async () => {
    const settings = config();
    if (!settings.token) return { success: false, error: 'SMS_TOKEN must be configured on the server' };

    const result = await requestProvider(
        makeUrl(settings.apiUrl, 'sendsms', {
            token: settings.token,
            credit: settings.creditType,
            sender: settings.sender,
            checkcredit: '1'
        }),
        'credit check'
    );
    return result.success
        ? { success: true, credits: result.response }
        : { success: false, error: result.error, statusCode: result.statusCode };
};

// Exported for focused tests and diagnostics; do not expose this through an HTTP route.
exports._normalizePhone = normalizePhone;
