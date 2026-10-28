# Baani Jewels — E-Commerce Platform

Production codebase for **Baani Jewels** featuring a modern customer storefront, comprehensive administrative dashboard, and a robust Node.js/Express API.

## Architecture

- **Storefront (`frontend/`)**: React + Vite + Tailwind CSS e-commerce application (`https://baanijewels.com`).
- **Admin Dashboard (`backend/panel/admin_dashboard/`)**: React + Vite management interface (`https://baanidashboard.baanijewels.com`).
- **Backend API (`backend/node/`)**: Node.js + Express + MySQL/Sequelize REST API (`https://baanijewelsapi.com`).
- **Database Dump**: `DEPLOYMENT_PACKAGES/DATABASE_sts_baanijewels_db.sql`

## Quick Start

### Backend API
```bash
cd backend/node
npm install
npm run dev # or npm start
```

### Customer Storefront
```bash
cd frontend
npm install
npm run dev
```

### Admin Dashboard
```bash
cd backend/panel/admin_dashboard
npm install
npm run dev
```

## Production Deployment Packages
Standalone pre-bundled archives are maintained under `DEPLOYMENT_PACKAGES/` for cPanel / Webuzo hosting environments.
