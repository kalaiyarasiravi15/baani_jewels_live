const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const localEnvFile = path.join(rootDir, '.env');

// First check if local .env exists and is configured for local dev (PORT=8000, root)
if (fs.existsSync(localEnvFile)) {
  try {
    require('dotenv').config({ path: localEnvFile });
  } catch (_) {}
}

const isLocalDev = (process.env.PORT === '8000' || process.env.DB_USER === 'root') && process.env.NODE_ENV !== 'production';

if (isLocalDev) {
  // Preserve exact local development configuration
  process.env.PORT = process.env.PORT || '8000';
  process.env.DB_USER = process.env.DB_USER || 'root';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  process.env.DB_NAME = process.env.DB_NAME || 'baani_jewel_db';
} else {
  // Production environment - Load production env candidates
  const prodCandidates = [
    path.join(rootDir, '.env.production'),
    path.join(rootDir, 'env.production'),
    path.join(rootDir, 'env.json'),
    path.join(process.cwd(), '.env.production')
  ];

  for (const candidate of prodCandidates) {
    if (fs.existsSync(candidate)) {
      if (candidate.endsWith('.json')) {
        try {
          const jsonConfig = JSON.parse(fs.readFileSync(candidate, 'utf8'));
          for (const [k, v] of Object.entries(jsonConfig)) {
            if (!process.env[k] || process.env[k].trim() === '') process.env[k] = String(v);
          }
        } catch (_) {}
      } else {
        try {
          require('dotenv').config({ path: candidate });
        } catch (_) {}
      }
    }
  }

  // Live Webuzo Production Defaults (guaranteed fallback for Webuzo deployment)
  const WEBUZO_PRODUCTION_DEFAULTS = {
    PORT: '30006',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'stsforce_baaniuser',
    DB_PASSWORD: 'ypZm#vx0P&',
    DB_NAME: 'stsforce_baanidb',
    JWT_SECRET: 'baani_jewels_secret_key_2026',
    FRONTEND_URL: 'https://baanijewels.com',
    ADMIN_URL: 'https://baanidashboard.baanijewels.com',
    BACKEND_URL: 'https://baaniapi.baanijewels.com',
    CORS_ORIGINS: 'https://baanijewels.com,https://www.baanijewels.com,https://baanidashboard.baanijewels.com,https://baaniapi.baanijewels.com,http://localhost:5173,http://localhost:5175,http://localhost:5176',
    EMAIL_USER: 'Baanijewels.ind@gmail.com',
    EMAIL_PASS: 'zojnfrfwbzipykdb',
    SUPPORT_PHONE: '+91 93453 22621',
    SUPPORT_EMAIL: 'Baanijewels.ind@gmail.com',
    RAZORPAY_KEY: 'rzp_test_TBPx9EL1T1aqhC',
    RAZORPAY_KEY_ID: 'rzp_test_TBPx9EL1T1aqhC',
    RAZORPAY_SECRET: '93C5GlOnEIHr19OhtD960RLX',
    RAZORPAY_KEY_SECRET: '93C5GlOnEIHr19OhtD960RLX',
    VITE_RAZORPAY_KEY: 'rzp_test_TBPx9EL1T1aqhC'
  };

  for (const [k, v] of Object.entries(WEBUZO_PRODUCTION_DEFAULTS)) {
    if (!process.env[k] || process.env[k].trim() === '' || (k === 'DB_USER' && process.env[k] === 'root')) {
      process.env[k] = v;
    }
  }
}

module.exports = process.env;
