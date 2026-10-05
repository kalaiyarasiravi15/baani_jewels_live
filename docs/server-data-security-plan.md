# Server-owned data and access controls

Approved scope: preserve existing UI and shopping/admin functionality. Store business data, authentication sessions, OTPs, guest order access and preferences in the server database. Browser holds an opaque HttpOnly session cookie only; transient rendered React state is not persistent storage.

1. Inventory existing storage and route permissions; preserve existing data.
2. Add database session, hashed OTP, guest access and rate-limit records. Rotate cookies at login; enforce CSRF and explicit CORS origins.
3. Convert storefront/admin authentication and cart/wishlist/preferences to server APIs. Import legacy browser data only after verifying ownership; clear only successfully imported values.
4. Protect order tracking, customer/address APIs, admin APIs and unapproved review media. Remove header/admin/JWT identity ambiguity.
5. Validate isolated security tests, database schema and frontend/admin builds; retain UI layout.
6. Configure central production database/TLS/private networking and deploy only to an identified target. No remote database target has been supplied yet. Do not delete or move existing data until a verified export/import is available.

Status: implementation in progress. Existing SMTP and Razorpay credentials were rejected by their providers earlier; do not simulate successful email/payment.
