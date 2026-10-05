const { Customer, CustomerAddress, ShippingAddress, Cart, Wishlist, Order, OrderSlot, Review } = require('../models/index');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');
const { signIn } = require('../utils/sessionSecurity');
const { Op } = require('sequelize');
const transporter = require('../utils/mailer');
const { buildThemedEmailHtml } = require('../utils/emailTheme');
const sms = require('../utils/smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'ars_fashion_customer_secret_2026';

// OTP Stores (in-memory)
const otpStore = require('../utils/otpStore')('customer-reset');
const regOtpStore = require('../utils/otpStore')('registration');
const deleteOtpStore = require('../utils/otpStore')('account-delete');

// ── Nodemailer transporter ──

// ── Verify transporter on startup ──


// ── Helper: send email ──
const sendMail = async (to, subject, html, meta = {}) => {
  try {
    const info = await transporter.sendMail({
      from: `"Baani Jewellery" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: buildThemedEmailHtml({
        title: meta.title || "Baani Jewellery",
        intro: meta.intro || '',
        body: html,
        footer: meta.footer || 'You are receiving this email because you have an account with Baani Jewellery\'s Trove.',
        ctaText: meta.ctaText,
        ctaUrl: meta.ctaUrl,
        highlight: meta.highlight || 'Account Update',
      }),
    });
    console.log(` Email sent to ${to}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(` Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// 1. REGISTER — sends welcome message only (NO OTP)
// 1a. SEND REGISTRATION OTP — Step 1: name + email + phone → OTP sent to email
exports.sendRegisterOtp = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const nameRegex  = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanPhone = phone ? String(phone).trim().replace(/\D/g, '') : '';

    if (!name || name.trim().length < 3 || name.trim().length > 30 || !nameRegex.test(name.trim()))
      return res.status(400).json({ message: 'Name must be 3-30 characters and contain only letters and spaces (numbers not allowed)!' });
    if (!email || !email.includes('@') || !emailRegex.test(email.trim()))
      return res.status(400).json({ message: 'Enter a valid email address containing @!' });
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15)
      return res.status(400).json({ message: 'Enter a valid mobile number (7-15 digits)!' });

    const existing = await Customer.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existing)
      return res.status(400).json({ message: 'Email already registered! Please login.' });

    const otp = require('crypto').randomInt(100000, 1000000).toString();
    const key  = email.trim().toLowerCase();
    await regOtpStore.set(req.sessionRecord.id + ':' + key, { otp, name: name.trim(), phone: phone.trim(), expiresAt: Date.now() + 10 * 60 * 1000 });

    const mailResult = await sendMail(
      key,
      `OTP — Baani Jewellery Registration`,
      `
        <div style="text-align:center;">
          <p style="font-size:16px;color:#111827;margin-bottom:12px;">Hi <strong>${name.trim()}</strong>, your registration OTP is:</p>
          <div style="background:#faf7f2;border:2px dashed #c9a84c;border-radius:12px;padding:16px 20px;display:inline-block;margin:16px 0;width:fit-content;max-width:90%;">
            <h1 class="otp-display" style="letter-spacing:4px;color:#12382e;font-size:26px;font-weight:700;margin:0;word-break:break-word;">${otp}</h1>
          </div>
          <p style="color:#ef4444;font-size:14px;font-weight:bold;">Valid for 10 minutes only.</p>
        </div>
      `,
      { title: 'Registration OTP', highlight: 'Action Required' }
    );

    if (!mailResult.success) {
      await regOtpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(503).json({ message: 'Unable to send OTP email right now. Please try again later or contact support.' });
    }

    // SMS: Also send OTP to phone
    sms.sendOtpSMS(phone.trim(), otp);

    res.json({ message: 'OTP sent to your email! Valid for 10 minutes.' });
  } catch (error) {
    console.error('sendRegisterOtp error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 1b. RESEND REGISTRATION OTP
exports.resendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required!' });

    const key    = email.trim().toLowerCase();
    const record = await regOtpStore.get(req.sessionRecord.id + ':' + key);
    if (!record) return res.status(400).json({ message: 'Please start registration again.' });

    const otp = require('crypto').randomInt(100000, 1000000).toString();
    await regOtpStore.set(req.sessionRecord.id + ':' + key, { ...record, verified: false, otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    const mailResult = await sendMail(
      key,
      `Resend OTP — Baani Jewellery`,
      `
        <div style="text-align:center;">
          <p style="font-size:16px;color:#111827;margin-bottom:12px;">Hi <strong>${record.name}</strong>, your new OTP is:</p>
          <div style="background:#faf7f2;border:2px dashed #c9a84c;border-radius:12px;padding:16px 20px;display:inline-block;margin:16px 0;width:fit-content;max-width:90%;">
            <h1 class="otp-display" style="letter-spacing:4px;color:#12382e;font-size:26px;font-weight:700;margin:0;word-break:break-word;">${otp}</h1>
          </div>
          <p style="color:#ef4444;font-size:14px;font-weight:bold;">Valid for 10 minutes only.</p>
        </div>
      `,
      { title: 'New Registration OTP', highlight: 'Action Required' }
    );

    if (!mailResult.success) {
      await regOtpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(503).json({ message: 'Unable to send OTP email right now. Please try again later or contact support.' });
    }

    res.json({ message: 'New OTP sent to your email!' });
  } catch (error) {
    console.error('resendRegisterOtp error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 1c. VERIFY REGISTRATION OTP — Step 2
exports.verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required!' });

    const key    = email.trim().toLowerCase();
    const record = await regOtpStore.get(req.sessionRecord.id + ':' + key);

    if (!record)
      return res.status(400).json({ message: 'OTP not found or already expired. Please start again.' });
    if (Date.now() > record.expiresAt) {
      await regOtpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(400).json({ message: 'OTP expired (10 minutes). Please request a new one.' });
    }
    if (!await regOtpStore.check(req.sessionRecord.id + ':' + key, String(otp).trim()))
      return res.status(400).json({ message: 'Incorrect OTP! Please check and try again.' });

    // Mark OTP as verified (keep record for final step)
    await regOtpStore.verify(req.sessionRecord.id + ':' + key);

    res.json({ message: 'OTP verified! Please set your password.' });
  } catch (error) {
    console.error('verifyRegisterOtp error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 1d. COMPLETE REGISTRATION — Step 3: set password → create account (NO address)
exports.registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const nameRegex     = /^[a-zA-Z\s]+$/;
    const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanPhone    = phone ? String(phone).trim().replace(/\D/g, '') : '';

    if (!name || name.trim().length < 3 || name.trim().length > 30 || !nameRegex.test(name.trim()))
      return res.status(400).json({ message: 'Name must be 3-30 characters and contain only letters and spaces (numbers not allowed)!' });
    if (!email || !email.includes('@') || !emailRegex.test(email.trim()))
      return res.status(400).json({ message: 'Enter a valid email address containing @!' });
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 15)
      return res.status(400).json({ message: 'Mobile number must be 7-15 digits!' });
    if (!password || password.length < 4)
      return res.status(400).json({ message: 'Password must be at least 4 characters (you can use letters, numbers, and special characters)!' });

    const key = email.trim().toLowerCase();

    const verification = await regOtpStore.get(req.sessionRecord.id + ':' + key);
    if (!verification || !verification.verified || Date.now() > verification.expiresAt) {
      await regOtpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(400).json({ message: 'Verify the registration OTP first. OTP is valid for 10 minutes.' });
    }
    const verifiedPhoneClean = String(verification.phone || '').replace(/\D/g, '');
    if (verification.name !== name.trim() || verifiedPhoneClean !== cleanPhone) {
      return res.status(400).json({ message: 'Registration details do not match the verified OTP request.' });
    }

    const existing = await Customer.findOne({ where: { email: key } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered! Please login.' });
    }

    // Keep every deleted customer record for admin/order history. Legacy deleted
    // records that still use the original email are archived with a unique suffix.
    const archivedAccount = await Customer.findOne({ where: { email: key }, paranoid: false });
    if (archivedAccount?.deletedAt) {
      const archivedEmail = key.includes('@')
        ? key.replace('@', `_deleted_${Date.now()}@`)
        : `${key}_deleted_${Date.now()}`;
      await archivedAccount.update({ email: archivedEmail }, { paranoid: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      name:     name.trim(),
      email:    key,
      phone:    phone.trim(),
      password: hashedPassword,
    });
    await regOtpStore.delete(req.sessionRecord.id + ':' + key);

    sendMail(
      customer.email,
      `Welcome to Baani Jewellery! 🎉`,
      `
        <p style="font-size:16px;color:#111827;">Hi <strong>${customer.name}</strong>, your account has been created successfully.</p>
        <p style="font-size:15px;color:#374151;">You can now login, start shopping, and receive our latest deals and new offers by email.</p>
        <div style="background:#faf7f2;border-left:4px solid #c9a84c;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;color:#12382e;font-size:14px;font-weight:600;">
            Stay tuned for product launches, seasonal offers, and exclusive subscriber-only promotions.
          </p>
        </div>
        <p style="font-size:14px;font-weight:bold;color:#12382e;">Thank you for joining us. Happy Purchasing! ❤️</p>
      `,
      { title: 'Welcome Aboard!', highlight: 'New Account', intro: 'We are thrilled to have you.' }
    );

    // SMS: Welcome message to phone
    sms.sendWelcomeSMS(customer.phone, customer.name);

    await signIn(req, res, 'customer', customer);
    res.status(201).json({
      message: `Registered Successfully! Welcome to Baani Jewellery.`,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
    });
  } catch (error) {
    console.error('Register error details:', error);
    res.status(500).json({ error: error.message });
  }
};

// 1e. GUEST CHECKOUT
exports.guestCheckout = async (req, res) => { res.json({ message: 'Proceed using guest checkout.', customer: { name: String(req.body.name || ''), email: String(req.body.email || ''), phone: String(req.body.phone || ''), isGuest: true } }); };

// 2. LOGIN — sends login success message only (NO OTP)
exports.loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.includes('@'))
      return res.status(400).json({ message: 'Email must contain @ symbol and be valid!' });

    if (typeof password !== 'string' || password.length < 4 || password.length > 128)
      return res.status(400).json({ message: 'Enter a valid password.' });

    const customer = await Customer.findOne({
      where: { email: email.trim().toLowerCase() },
      include: [{ model: CustomerAddress }, { model: ShippingAddress }],
    });
    if (!customer)
      return res.status(404).json({ message: 'Email not registered. Please register first!' });

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Incorrect password!' });

    // ── Login success email ──
    sendMail(
      customer.email,
      `Baani Jewellery — Login Successful `,
      `
        <p style="font-size:16px;color:#111827;margin-bottom:8px;">Hi <strong>${customer.name}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:20px;">You have successfully logged in to your Baani Jewellery account.</p>
        <div style="background:#faf7f2;border-left:4px solid #12382e;padding:16px;border-radius:6px;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#12382e;line-height:1.6;">
            Explore our latest collections, check your mailbox for deals and offers, and enjoy subscriber-only updates just for you!
          </p>
        </div>
      `,
      { title: 'Login Successful', highlight: 'Security Alert', intro: 'New login detected on your account.' }
    );

    // SMS: Login alert (fire-and-forget, non-blocking)
    sms.sendLoginAlertSMS(customer.phone, customer.name);

    await signIn(req, res, 'customer', customer);
    res.json({
      message: 'Login Successful!',
      customer: {
        id:                customer.id,
        name:              customer.name,
        email:             customer.email,
        phone:             customer.phone,
        createdAt:         customer.createdAt,
        addresses:         customer.CustomerAddresses  || [],
        shippingAddresses: customer.ShippingAddresses  || [],
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 3. GET ALL
exports.getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;
        const whereClause = { isGuest: false };

        if (page) {
            const offset = (page - 1) * limit;
            const { count, rows } = await Customer.findAndCountAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            return res.status(200).json({
                success: true,
                customers: rows,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const customers = await Customer.findAll({
            where: whereClause,
            include: [{ model: ShippingAddress }, { model: CustomerAddress }],
            order: [['createdAt', 'DESC']],
            // Admin must be able to see soft-deleted accounts. Their orders
            // remain linked to this archived account.
            paranoid: false
        });
        const customersWithStats = await Promise.all(customers.map(async (c) => {
            const customerOrders = await Order.findAll({
                where: {
                    [Op.or]: [
                        { customerId: c.id },
                        ...(c.email ? [{ guestEmail: c.email }] : [])
                    ]
                },
                attributes: ['totalAmount', 'orderStatus']
            });
            const validOrders = customerOrders.filter(o => o.orderStatus !== 'Cancelled');
            const orderCount = validOrders.length;
            const totalSpent = validOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
            const highestPurchase = validOrders.reduce((max, o) => Math.max(max, parseFloat(o.totalAmount) || 0), 0);
            const { password, ...safeCustomer } = c.toJSON();
            return {
                ...safeCustomer,
                customerType: 'REGISTERED',
                orderCount,
                totalSpent: Math.round(totalSpent * 100) / 100,
                highestPurchase: Math.round(highestPurchase * 100) / 100
            };
        }));
        res.status(200).json(customersWithStats);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET GUESTS
exports.getGuestCustomers = async (req, res) => {
  try {
    const guests = await Customer.findAll({
      where: { isGuest: true },
      include: [{ model: ShippingAddress }, { model: CustomerAddress }],
      order: [['createdAt', 'DESC']]
    });
    const guestsWithStats = await Promise.all(guests.map(async (g) => {
      const orderCount = await Order.count({
        where: {
          [Op.or]: [
            { customerId: g.id },
            { guestEmail: g.email }
          ]
        }
      });
      const totalSpentResult = await Order.sum('totalAmount', {
        where: {
          [Op.or]: [
            { customerId: g.id },
            { guestEmail: g.email }
          ],
          paymentStatus: 'Paid'
        }
      });
      return {
        ...(() => { const { password, ...safeGuest } = g.toJSON(); return safeGuest; })(),
        customerType: 'GUEST',
        orderCount,
        totalSpent: parseFloat(totalSpentResult || 0)
      };
    }));
    // Also aggregate direct guest buyers from the Order table
    const guestOrders = await Order.findAll({
      where: { customerType: 'GUEST' },
      order: [['createdAt', 'DESC']]
    });

    const knownEmails = new Set(guests.map(g => (g.email || '').toLowerCase()));
    const orderGuestsMap = new Map();

    for (const ord of guestOrders) {
      const email = (ord.guestEmail || ord.snapPhone || '').toLowerCase();
      if (!email || knownEmails.has(email)) continue;

      if (!orderGuestsMap.has(email)) {
        orderGuestsMap.set(email, {
          id: `guest_${ord.id || ord.orderId}`,
          name: ord.snapName || 'Guest User',
          email: ord.guestEmail || '—',
          phone: ord.snapPhone || '—',
          customerType: 'GUEST',
          isGuest: true,
          createdAt: ord.createdAt,
          orderCount: 1,
          totalSpent: parseFloat(ord.totalAmount || 0),
          ShippingAddresses: ord.snapAddressLine ? [{
            id: `ship_${ord.id || ord.orderId}`,
            name: ord.snapName,
            phone: ord.snapPhone,
            addressLine: ord.snapAddressLine,
            city: ord.snapCity,
            district: ord.snapDistrict,
            state: ord.snapState,
            pincode: ord.snapPincode
          }] : []
        });
      } else {
        const existing = orderGuestsMap.get(email);
        existing.orderCount += 1;
        existing.totalSpent += parseFloat(ord.totalAmount || 0);
      }
    }

    const allGuests = [...guestsWithStats, ...Array.from(orderGuestsMap.values())];
    res.json(allGuests);
  } catch (error) {
    console.error('getGuestCustomers error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 4. GET SINGLE
exports.getSingleCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: CustomerAddress }, { model: ShippingAddress }],
      attributes: { exclude: ['password'] },
    });
    if (!customer) return res.status(404).json({ message: 'Customer Not Found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. UPDATE PROFILE
exports.updateCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;

    // ✅ Fixed: supports Tamil, Hindi, English, dots, hyphens, apostrophes
    const nameRegex  = /^[\p{L}\s.\-']+$/u;
    const phoneRegex = /^\d{10}$/;

    if (!name || !name.trim())
      return res.status(400).json({ message: 'Name is required!' });
    if (!nameRegex.test(name.trim()))
      return res.status(400).json({ message: 'Full name contains invalid characters!' });
    // ✅ Fixed: phone is validated only if provided (not empty)
    if (phone && phone.trim() && !phoneRegex.test(phone.trim()))
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits!' });

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const updateData = { name: name.trim() };
    if (phone && phone.trim()) updateData.phone = phone.trim();

    await customer.update(updateData);
    res.json({ message: 'Updated Successfully!', customer: { id: customer.id, name: customer.name, phone: customer.phone } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. REQUEST ACCOUNT-DELETION OTP
exports.requestDeleteOtp = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findByPk(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const otp = require('crypto').randomInt(100000, 1000000).toString();
    const key = customer.email.trim().toLowerCase();
    await deleteOtpStore.set(req.sessionRecord.id + ':' + customerId, { otp, email: key, expiresAt: Date.now() + 10 * 60 * 1000 });

    const mailResult = await sendMail(
      key,
      `Confirm Account Deletion OTP — Baani Jewellery`,
      `
        <div style="text-align:center;">
          <p style="font-size:16px;color:#111827;margin-bottom:12px;">Hi <strong>${customer.name}</strong>, use this OTP to confirm deletion of your account:</p>
          <div style="background:#faf7f2;border:2px dashed #c9a84c;border-radius:12px;padding:16px 20px;display:inline-block;margin:16px 0;width:fit-content;max-width:90%;">
            <h1 class="otp-display" style="letter-spacing:4px;color:#12382e;font-size:26px;font-weight:700;margin:0;word-break:break-word;">${otp}</h1>
          </div>
          <p style="color:#ef4444;font-size:14px;font-weight:bold;">This OTP is valid for 10 minutes.</p>
          <p style="color:#374151;font-size:14px;margin-top:12px;">Your order history will be retained securely.</p>
        </div>
      `,
      { title: 'Account Deletion OTP', highlight: 'Action Required', intro: 'We are sorry to see you go.' }
    );
    if (!mailResult.success) {
      await deleteOtpStore.delete(req.sessionRecord.id + ':' + customerId);
      return res.status(500).json({ message: 'Failed to send deletion OTP. Please try again.' });
    }
    res.json({ message: 'Deletion OTP sent to your registered email. Valid for 10 minutes.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6.5 DELETE CUSTOMER (OTP-confirmed soft delete)
exports.deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const { otp } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const verification = await deleteOtpStore.get(req.sessionRecord.id + ':' + customerId);
    if (!otp || !verification || !await deleteOtpStore.check(req.sessionRecord.id + ':' + customerId, String(otp).trim(), true)) {
      return res.status(400).json({ message: 'Enter the valid account-deletion OTP.' });
    }
    if (Date.now() > verification.expiresAt) {
      await deleteOtpStore.delete(req.sessionRecord.id + ':' + customerId);
      return res.status(400).json({ message: 'Deletion OTP expired. Request a new OTP.' });
    }

    // Rename the email to free it up for future registrations, while preserving the record for admin orders
    const suffix = `_deleted_${Date.now()}`;
    const oldEmail = customer.email;
    const newEmail = oldEmail.includes('@') 
      ? oldEmail.replace('@', `${suffix}@`) 
      : `${oldEmail}${suffix}`;

    // Clear transient items (Cart and Wishlist)
    await Cart.destroy({ where: { customerId } });
    await Wishlist.destroy({ where: { customerId } });

    // Update email before soft-deleting
    await customer.update({ email: newEmail });

    // Perform soft-delete on the customer record
    const result = await customer.destroy();
    await deleteOtpStore.delete(req.sessionRecord.id + ':' + customerId);
    
    if (result) {
      sendMail(
        oldEmail,
        `Account Deleted — Baani Jewellery`,
        `
          <p style="margin:0 0 12px;color:#374151">Hi <strong>${customer.name}</strong>,</p>
          <p style="margin:0 0 12px;color:#374151">Your account has been deleted successfully.</p>
          <p style="margin:0;color:#111827">Your order history and admin records are preserved securely.</p>
        `,
        {
          title: 'Account Deleted',
          intro: 'Your account deletion request has been completed.',
          footer: 'If you change your mind later, you can create a new account using the same email.',
          highlight: 'Account Update'
        }
      );
      // SMS: Account deleted notification
      sms.sendAccountDeletedSMS(customer.phone, customer.name);
      res.json({ message: 'Customer account soft-deleted successfully! Order history is fully preserved.' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6.5 CHANGE PASSWORD FOR LOGGED-IN CUSTOMER
exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const customerId = req.params.id;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters!' });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found!' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await customer.update({ password: hashed });
    await require('../models/securityModels').Session.destroy({ where: { customerId: customer.id } });

    sendMail(
      customer.email,
      `Password Updated — Baani Jewellery`,
      `
        <p style="margin:0 0 12px;color:#374151">Hi <strong>${customer.name}</strong>,</p>
        <p style="margin:0 0 12px;color:#374151">Your login password has been updated successfully.</p>
        <p style="margin:0;color:#111827;font-weight:700">If you didn't make this change, please contact support immediately.</p>
      `,
      {
        title: 'Password Changed',
        intro: 'Your account password was updated successfully.',
        footer: 'Please keep your password safe and do not share it with anyone.',
        highlight: 'Security Notice'
      }
    );

    res.json({ message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 7. ADD SHIPPING ADDRESS

exports.addShippingAddress = async (req, res) => {
  try {
    const { customerId, name, phone, addressLine, city, state, pincode, district } = req.body;

    const nameRegex    = /^[a-zA-Z\s]+$/;
    const phoneRegex   = /^\d{10}$/;
    const pincodeRegex = /^\d{6}$/;

    // ── Trim all incoming strings before validation ──
    const trimmedName        = (name        || '').trim();
    const trimmedPhone       = (phone       || '').trim();
    const trimmedAddressLine = (addressLine || '').trim();
    const trimmedCity        = (city        || '').trim();
    const trimmedState       = (state       || '').trim();
    const trimmedPincode     = (pincode     || '').trim();
    const trimmedDistrict    = (district    || '').trim();

    // ── Validate ──
    if (!trimmedName || !nameRegex.test(trimmedName))
      return res.status(400).json({ message: 'Full name is required and must contain only letters and spaces!' });
    if (!trimmedPhone || !phoneRegex.test(trimmedPhone))
      return res.status(400).json({ message: 'Phone number is required and must be exactly 10 digits!' });
    if (!trimmedAddressLine)
      return res.status(400).json({ message: 'Address is required!' });
    if (!trimmedCity)
      return res.status(400).json({ message: 'City is required!' });
    if (!trimmedState)
      return res.status(400).json({ message: 'State is required!' });
    if (!trimmedPincode || !pincodeRegex.test(trimmedPincode))
      return res.status(400).json({ message: 'PIN Code is required and must be exactly 6 digits!' });

    const customer = await Customer.findByPk(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer Not Found!' });

    // ── Update existing shipping address if matched, or create new ──
    const existing = await ShippingAddress.findOne({
      where: {
        customerId,
        addressLine: trimmedAddressLine,
        city:        trimmedCity,
        state:       trimmedState,
        pincode:     trimmedPincode,
      },
    });
    if (existing) {
      await existing.update({ name: trimmedName, phone: trimmedPhone, district: trimmedDistrict });
      if (customer && trimmedName) {
        await customer.update({ name: trimmedName, phone: trimmedPhone });
      }
      return res.status(200).json({ message: 'Shipping Address Updated!', address: existing, id: existing.id });
    }

    if (customer && trimmedName) {
      await customer.update({ name: trimmedName, phone: trimmedPhone });
    }

    // ── Create new shipping address ──
    const shipping = await ShippingAddress.create({
      customerId,
      name:        trimmedName,
      phone:       trimmedPhone,
      addressLine: trimmedAddressLine,
      city:        trimmedCity,
      state:       trimmedState,
      pincode:     trimmedPincode,
      district:    trimmedDistrict || null,
    });

    res.status(201).json({ message: 'Shipping Address Added!', address: shipping });
  } catch (error) {
    console.error('addShippingAddress error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 8. DELETE SHIPPING
exports.deleteShippingAddress = async (req, res) => {
  try {
    const deleted = await ShippingAddress.destroy({ where: { id: req.params.id } });
    if (deleted) res.json({ message: 'Shipping Address deleted!' });
    else res.status(404).json({ message: 'Address not found!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 9. UPDATE SHIPPING ADDRESS
exports.updateShippingAddress = async (req, res) => {
  try {
    const { houseNo, street, addressLine, city, state, pincode, country, name, phone, district } = req.body;
    const address = await ShippingAddress.findByPk(req.params.id);
    if (!address) return res.status(404).json({ message: 'Shipping address not found' });

    // Support both old (houseNo+street) and new (addressLine) formats
    const resolvedAddressLine = addressLine ||
      (houseNo && street ? `${houseNo}, ${street}` : address.addressLine);

    await address.update({
      addressLine: resolvedAddressLine || address.addressLine,
      city:     city     || address.city,
      state:    state    || address.state,
      pincode:  pincode  || address.pincode,
      country:  country  || address.country,
      name:     name     !== undefined ? name     : address.name,
      phone:    phone    !== undefined ? phone    : address.phone,
      district: district !== undefined ? district : address.district,
    });
    res.json({ message: 'Shipping address updated!', data: address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 9b. UPDATE CUSTOMER ADDRESS
exports.updateCustomerAddress = async (req, res) => {
  try {
    const { houseNo, street, city, state, pincode, country, district } = req.body;
    const address = await CustomerAddress.findByPk(req.params.id);
    if (!address) return res.status(404).json({ message: 'Address not found' });
    await address.update({
      houseNo:  houseNo  || address.houseNo,
      street:   street   || address.street,
      city:     city     || address.city,
      state:    state    || address.state,
      pincode:  pincode  || address.pincode,
      country:  country  || address.country,
      district: district !== undefined ? district : address.district, 
    });
    res.json({ message: 'Address updated!', data: address });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 10. SAVE SETTINGS
exports.saveSettings = async (req, res) => {
  try {
    const { emailNotif, smsNotif, promoOffers } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await customer.update({
      emailNotif:  emailNotif  ?? customer.emailNotif,
      smsNotif:    smsNotif    ?? customer.smsNotif,
      promoOffers: promoOffers ?? customer.promoOffers,
    });
    res.json({ message: 'Settings saved!' });
  } catch (error) {
    res.json({ message: 'Settings saved!' });
  }
};

// 11. FORGOT PASSWORD — OTP email sent ONLY here
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@'))
      return res.status(400).json({ message: 'Email must contain @ symbol and be valid!' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim()))
      return res.status(400).json({ message: 'Please enter a valid email address with @ symbol!' });

    const customer = await Customer.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!customer) return res.status(404).json({ message: 'Email not registered!' });

    const otp = require('crypto').randomInt(100000, 1000000).toString();
    const key = email.trim().toLowerCase();
    await otpStore.set(req.sessionRecord.id + ':' + key, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    const mailResult = await sendMail(
      key,
      `Password Reset OTP — Baani Jewellery`,
      `
        <div style="text-align:center;">
          <p style="font-size:16px;color:#111827;margin-bottom:12px;">Hi <strong>${customer.name}</strong>, your OTP to reset your password is:</p>
          <div style="background:#faf7f2;border:2px dashed #c9a84c;border-radius:12px;padding:16px 20px;display:inline-block;margin:16px 0;width:fit-content;max-width:90%;">
            <h1 class="otp-display" style="letter-spacing:4px;color:#12382e;font-size:26px;font-weight:700;margin:0;word-break:break-word;">${otp}</h1>
          </div>
          <p style="color:#ef4444;font-size:14px;font-weight:bold;">This OTP is valid for 10 minutes only.</p>
        </div>
      `,
      { title: 'Password Reset OTP', highlight: 'Action Required', intro: 'You requested a password reset.', footer: 'If you didn\'t request this, please ignore this email.' }
    );

    if (!mailResult.success) {
      await otpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(503).json({ message: 'Unable to send OTP email right now. Please try again later or contact support.' });
    }

    // SMS: Also send OTP to phone for quick access
    if (customer.phone) {
      sms.sendOtpSMS(customer.phone, otp);
    }

    res.json({ message: 'OTP sent to your email! Valid for 10 minutes.' });
  } catch (error) {
    console.error('forgotPassword error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 12. VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required!' });

    const key = email.trim().toLowerCase();
    const record = await otpStore.get(req.sessionRecord.id + ':' + key);

    if (!record)
      return res.status(400).json({ message: 'OTP not requested or already expired!' });
    if (Date.now() > record.expiresAt) {
      await otpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(400).json({ message: 'OTP has expired (valid for 10 minutes). Please request a new one.' });
    }
    if (!await otpStore.check(req.sessionRecord.id + ':' + key, String(otp).trim()))
      return res.status(400).json({ message: 'Invalid OTP! Please check and try again.' });

    res.json({ message: 'OTP verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 13. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'Email, OTP and new password are required!' });

    const key = email.trim().toLowerCase();
    const record = await otpStore.get(req.sessionRecord.id + ':' + key);

    if (!record || !await otpStore.check(req.sessionRecord.id + ':' + key, String(otp).trim(), true))
      return res.status(400).json({ message: 'Invalid or expired OTP!' });
    if (Date.now() > record.expiresAt) {
      await otpStore.delete(req.sessionRecord.id + ':' + key);
      return res.status(400).json({ message: 'OTP expired (valid for 10 minutes). Request a new one.' });
    }

    if (!newPassword || newPassword.length < 4)
      return res.status(400).json({ message: 'New password must be at least 4 characters (you can use letters, numbers, and special characters)!' });

    const customer = await Customer.findOne({ where: { email: key } });
    if (!customer) return res.status(404).json({ message: 'Customer not found!' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await customer.update({ password: hashed });
    await require('../models/securityModels').Session.destroy({ where: { customerId: customer.id } });
    await otpStore.delete(req.sessionRecord.id + ':' + key);

    sendMail(
      key,
      `Password Changed Successfully — Baani Jewellery`,
      `
        <p style="font-size:16px;color:#111827;margin-bottom:12px;">Hi <strong>${customer.name}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:12px;">Your password has been <strong style="color:#12382e;">successfully updated</strong>. ✅</p>
        <div style="background:#faf7f2;border-left:4px solid #12382e;padding:16px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;font-size:14px;color:#12382e;line-height:1.6;">
            You can now safely login with your new password to continue shopping.
          </p>
        </div>
      `,
      { title: 'Password Changed', highlight: 'Security Alert', footer: 'If you didn\'t make this change, please contact our support immediately.' }
    );

    res.json({ message: 'Password updated successfully! You can now login with your new password.' });
  } catch (error) {
    console.error('resetPassword error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// 14. SEND DELIVERY REVIEW MAIL
exports.sendDeliveryReviewMail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { Product } = require('../models/index');

    const order = await Order.findOne({
      where: { orderId },
      include: [
        { model: Customer, attributes: ['name', 'email'] },
        {
          model: OrderSlot,
          as: 'slots',
          include: [{ model: Product, attributes: ['name'], required: false }],
        },
      ],
    });

    if (!order) return res.status(404).json({ message: 'Order not found!' });
    if (!order.Customer) return res.status(400).json({ message: 'Customer data missing!' });

    const customerName  = order.Customer.name;
    const customerEmail = order.Customer.email;

    const deliveryDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const paymentMethod = order.paymentMethod || 'Online Payment';
    const supportPhone  = process.env.SUPPORT_PHONE || '+91 98765 43210';
    const supportEmail  = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;

    const itemRows = (order.slots || [])
      .map(s => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #dde8d1;color:#333">
            ${s.Product ? s.Product.name : 'Item'}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #dde8d1;color:#555;text-align:center">
            × ${s.quantity || 1}
          </td>
        </tr>`)
      .join('');

    const mailResult = await sendMail(
      customerEmail,
      `Your Order ${orderId} Has Been Delivered!  — Baani Jewellery`,
      `
        <p style="font-size:16px;color:#111827;margin-bottom:8px;">Hi <strong>${customerName}</strong>,</p>
        <p style="font-size:15px;color:#374151;margin-bottom:24px;">
          We're happy to inform you that your order has been
          <strong style="color:#2d5a1b;">successfully delivered!</strong> 
        </p>

        <div style="background:#fefce8;border:1px solid #f5c542;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#2d5a1b"> Order Details</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151">
            <tr><td style="padding:5px 0;width:45%">Order ID</td><td style="padding:5px 0;color:#111827;font-weight:bold">#${orderId}</td></tr>
            <tr><td style="padding:5px 0">Delivery Date</td><td style="padding:5px 0;color:#111827">${deliveryDate}</td></tr>
            <tr><td style="padding:5px 0">Payment Method</td><td style="padding:5px 0;color:#111827">${paymentMethod}</td></tr>
          </table>
        </div>

        <p style="font-size:14px;font-weight:bold;color:#2d5a1b;margin:0 0 8px">🛒 Items Delivered</p>
        <div style="background:#f4f7f1;border-radius:8px;padding:12px 16px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr>
              <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid #dde8d1;color:#1f3f12">Product</th>
              <th style="text-align:center;padding-bottom:8px;border-bottom:1px solid #dde8d1;color:#1f3f12">Qty</th>
            </tr>
            ${itemRows}
          </table>
        </div>

        <div style="background:#f0fdf4;border-left:4px solid #2d5a1b;border-radius:0 6px 6px 0;padding:14px 16px;margin-bottom:24px">
          <p style="margin:0 0 4px;font-weight:bold;color:#1f3f12"> We Hope You Love It!</p>
          <p style="margin:0;font-size:13px;color:#374151">Thank you for shopping with Baani Jewellery. We hope you enjoy your purchase and we'd love to hear your feedback!</p>
        </div>
      `,
      { title: 'Order Delivered', highlight: 'Delivery Update', intro: 'Your order has reached its destination.' }
    );

    if (!mailResult.success) return res.status(503).json({ message: 'Unable to send review email. Please try again later.' });
    res.json({ message: 'Thank you / review mail sent to customer!' });
  } catch (error) {
    console.error('sendDeliveryReviewMail error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET LAST SHIPPING ADDRESS
exports.getLastShippingAddress = async (req, res) => {
  try {
    const customerId = req.params.id;
    const address = await ShippingAddress.findOne({
      where: { customerId },
      order: [['createdAt', 'DESC']]
    });
    
    if (!address) {
      return res.status(200).json({ address: null });
    }
    
    res.status(200).json({ address });
  } catch (error) {
    console.error('Error fetching last address:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// GET CUSTOMER ANALYTICS / STATS
exports.getCustomerStats = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await Customer.findByPk(customerId, { paranoid: false });
    const whereCondition = customer
      ? {
          [Op.or]: [
            { customerId: customer.id },
            ...(customer.email ? [{ guestEmail: customer.email }] : [])
          ]
        }
      : { customerId };
    
    // Total Orders
    const totalOrders = await Order.count({ where: whereCondition });
    
    // Canceled Orders
    const canceledOrders = await Order.count({ where: { ...whereCondition, orderStatus: 'Cancelled' } });
    
    // Successful Orders (Delivered)
    const successfulOrders = await Order.count({ where: { ...whereCondition, orderStatus: 'Delivered' } });
    
    // Total Spend (Paid or Delivered orders)
    const totalSpendResult = await Order.sum('totalAmount', {
      where: {
        ...whereCondition,
        paymentStatus: 'Paid'
      }
    });
    
    const totalSpend = parseFloat(totalSpendResult || 0);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        canceledOrders,
        successfulOrders,
        totalSpend
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error.message);
    res.status(500).json({ error: error.message });
  }
};
