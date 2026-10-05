const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createMailer } = require('../utils/mailer');

// Authentication check only: never sends a message or prints credentials.
const file = path.resolve(__dirname, '..', process.argv[2] || '.env');
const env = { ...dotenv.parse(fs.readFileSync(file)), ...process.env };
const mailer = createMailer(env);
const deadline = setTimeout(() => {
    console.error('Email verification timed out. Check outbound SMTP access.');
    process.exit(1);
}, 45000);
mailer.verify().then(() => {
    console.log('SMTP authentication successful. Inbox delivery has not been tested.');
}).catch(error => {
    console.error('SMTP verification failed:', error.code, error.responseCode || '', error.message);
    process.exitCode = 1;
}).finally(() => {
    clearTimeout(deadline);
    mailer.close();
});
