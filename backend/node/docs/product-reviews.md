# Delivered product reviews

Customers can review products from delivered orders in Account > Orders, Account > Your Reviews, or Track Order. Each distinct product in an order has a separate review. Multiple quantities or variants of the same product share its review.

New guest checkouts receive a signed order-specific review token stored on their device. Guests using old orders or another device verify the order email using a six-digit code, valid for ten minutes with five attempts. Guest email verification requires working EMAIL_USER / EMAIL_PASS (or custom SMTP configuration). OTP challenges currently live in server memory; after a restart or when using multiple server workers, request and verification must reach the same running process.

New reviews and customer edits are pending. Admin Reviews supports viewing attachments, changing text/rating, publishing, rejecting and deleting. Only published reviews and their ratings/photos/videos appear publicly. Customer cancellation deletes the review and its uploads; another review can then be submitted.

Media is optional: up to five combined JPEG, PNG, WebP, MP4 or WebM files, ten MB each. Existing attachments can be removed when editing. Upload authorization checks order ownership, delivered status and product membership before accepting files.

The backend startup migration permits a null customerId for guest reviews and removes the legacy unique order/customer index when present. Order row locks serialize submissions so guest reviews cannot be duplicated concurrently. Restart the backend after deploying. Rebuild the frontend and admin dashboard.

Run npm run test:reviews from backend/node for isolated HTTP integration coverage (models/mail are mocked; actual Express routes, JWT authorization and multipart handling run). These tests never send email or modify live order data. The frontend, customer order pages and product reviews refresh every thirty seconds while visible and when the window regains focus.
