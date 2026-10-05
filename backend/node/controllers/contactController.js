const ContactMessage = require('../models/ContactMessage');
const { Admin } = require('../models/index');
const transporter = require('../utils/mailer');
const { buildThemedEmailHtml } = require('../utils/emailTheme');

// Configure reusable transporter

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// 1. SEND (from website Contact page)
exports.sendMessage = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body || {};

        const trimmedName    = (name || '').trim();
        const trimmedEmail   = (email || '').trim().toLowerCase();
        const rawPhone       = (phone || '').trim();
        const trimmedSubject = (subject || '').trim();
        const trimmedMessage = (message || '').trim();

        // 1. Validate Name
        if (!trimmedName || !/^[a-zA-Z\s.'-]+$/.test(trimmedName) || trimmedName.length < 2) {
            return res.status(400).json({ success: false, message: "Please enter a valid full name (letters, spaces, dots, hyphens only)." });
        }

        // 2. Validate Phone (Supports all world countries: 7 to 15 digits, digits only or with country code prefix)
        const digitsOnly = rawPhone.replace(/\D/g, '');
        if (!digitsOnly || digitsOnly.length < 7 || digitsOnly.length > 15) {
            return res.status(400).json({ success: false, message: "Please enter a valid phone number (7 to 15 digits, numbers only)." });
        }

        // 3. Validate Email (Must include '@' symbol and valid domain)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address with '@' and domain (e.g., name@example.com)." });
        }

        // 4. Validate Subject
        if (!trimmedSubject || trimmedSubject.length < 3) {
            return res.status(400).json({ success: false, message: "Subject is required (minimum 3 characters)." });
        }

        // 5. Validate Message (Accepts numbers, digits, letters, special characters, multiline)
        if (!trimmedMessage || trimmedMessage.length < 5) {
            return res.status(400).json({ success: false, message: "Message is required (minimum 5 characters)." });
        }

        // 6. Validate Image Upload (Required)
        const uploadedImage = req.file ? req.file.filename : (req.body?.image ? String(req.body.image).trim() : null);
        if (!uploadedImage) {
            return res.status(400).json({ success: false, message: "Please upload an image or jewellery design reference photo." });
        }

        const displayPhone = rawPhone || digitsOnly;

        // Save to Database (store full international phone number and image)
        const msg = await ContactMessage.create({
            name:    trimmedName,
            email:   trimmedEmail,
            phone:   displayPhone,
            subject: trimmedSubject,
            message: trimmedMessage,
            image:   uploadedImage
        });

        // Send Email Notification to Admin in Background
        (async () => {
            try {
                // Fetch admin email addresses
                const admins = await Admin.findAll({ attributes: ['email'] });
                const candidateEmails = [
                    ...admins.map(a => a.email),
                    process.env.EMAIL_USER,
                    process.env.SUPPORT_EMAIL
                ];
                const adminEmails = [...new Set(
                    candidateEmails
                        .filter(Boolean)
                        .map(e => e.trim().toLowerCase())
                )];

                if (adminEmails.length > 0) {
                    const formattedDate = new Date().toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    });

                    const emailBodyHtml = `
                        <p style="font-size: 15px; color: #374151; margin-bottom: 20px;">
                            You have received a new customer enquiry from the <strong>Baani Jewels</strong> website contact page:
                        </p>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 10px 0; font-weight: 700; width: 140px; color: #12382e;">Customer Name:</td>
                                <td style="padding: 10px 0; color: #111827;">${escapeHtml(trimmedName)}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 10px 0; font-weight: 700; color: #12382e;">Email Address:</td>
                                <td style="padding: 10px 0; color: #111827;">
                                    <a href="mailto:${escapeHtml(trimmedEmail)}" style="color: #c9a84c; text-decoration: none; font-weight: 600;">
                                        ${escapeHtml(trimmedEmail)}
                                    </a>
                                </td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 10px 0; font-weight: 700; color: #12382e;">Phone Number:</td>
                                <td style="padding: 10px 0; color: #111827;">
                                    <a href="tel:${escapeHtml(displayPhone)}" style="color: #111827; text-decoration: none;">
                                        ${escapeHtml(displayPhone)}
                                    </a>
                                </td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 10px 0; font-weight: 700; color: #12382e;">Subject:</td>
                                <td style="padding: 10px 0; color: #111827; font-weight: 600;">${escapeHtml(trimmedSubject)}</td>
                            </tr>
                            ${uploadedImage ? `
                            <tr style="border-bottom: 1px solid #f3f4f6;">
                                <td style="padding: 10px 0; font-weight: 700; color: #12382e;">Design Photo:</td>
                                <td style="padding: 10px 0; color: #111827;">
                                    <a href="${(process.env.BACKEND_URL || 'https://baaniapi.baanijewels.com').replace(/\/$/, '')}/uploads/${uploadedImage}" target="_blank" style="color: #c9a84c; font-weight: 600;">
                                        View Attached Image (${uploadedImage}) ↗
                                    </a>
                                </td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 10px 0; font-weight: 700; color: #12382e;">Date & Time:</td>
                                <td style="padding: 10px 0; color: #6b7280;">${formattedDate}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 18px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                            <div style="font-weight: 700; font-size: 13px; color: #12382e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Message:</div>
                            <div style="font-size: 14.5px; line-height: 1.75; color: #1f2937; white-space: pre-wrap;">
                                ${escapeHtml(trimmedMessage)}
                            </div>
                        </div>
                    `;

                    const finalEmailHtml = buildThemedEmailHtml({
                        title: "New Contact Enquiry",
                        intro: `Customer Message from ${trimmedName}`,
                        body: emailBodyHtml,
                        footer: "This notification was automatically sent when a customer submitted the Contact form on Baani Jewels. You can view all enquiries in your Admin Panel Inbox.",
                        ctaText: "Open Admin Inbox",
                        ctaUrl: `${process.env.ADMIN_URL || 'https://baanidashboard.baanijewels.com'}/inbox`,
                        highlight: "New Inbox Message"
                    });

                    await transporter.sendMail({
                        from: `"Baani Jewels Contact" <${process.env.EMAIL_USER}>`,
                        to: adminEmails.join(', '),
                        subject: `✦ New Contact Enquiry: ${trimmedSubject} - ${trimmedName}`,
                        html: finalEmailHtml
                    });

                    console.log(` Contact notification email sent to admin: ${adminEmails.join(', ')}`);
                }
            } catch (mailErr) {
                console.error(" Failed to send admin contact notification email:", mailErr.message);
            }
        })();

        res.status(201).json({ 
            success: true, 
            message: "Submitted successfully! Thank you for reaching out, we will contact you soon.", 
            data: msg 
        });
    } catch (e) { 
        res.status(500).json({ success: false, error: e.message }); 
    }
};

// 2. GET ALL (Admin inbox)
exports.getAllMessages = async (req, res) => {
        try {
            const page = parseInt(req.query.page, 10);
            const limit = parseInt(req.query.limit, 10) || 10;

            if (page) {
                const offset = (page - 1) * limit;
                const { count, rows } = await ContactMessage.findAndCountAll({
                    where: { isDeleted: false },
                    order: [['createdAt', 'DESC']],
                    limit,
                    offset
                });
                return res.json({
                    success: true,
                    messages: rows,
                    totalCount: count,
                    totalPages: Math.ceil(count / limit)
                });
            }

            const messages = await ContactMessage.findAll({ 
                where: { isDeleted: false },
                order: [['createdAt', 'DESC']] 
            });
            res.json(messages);
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    };

// 3. GET SINGLE
exports.getMessage = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        // Mark as read
        if (!msg.isRead) await msg.update({ isRead: true });
        res.json(msg);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. MARK READ
exports.markRead = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        await msg.update({ isRead: true });
        res.json({ message: "Marked as read" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 5. DELETE (soft)
exports.deleteMessage = async (req, res) => {
    try {
        const msg = await ContactMessage.findByPk(req.params.id);
        if (!msg) return res.status(404).json({ message: "Not found" });
        await msg.destroy();
        res.json({ message: "Message deleted!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 6. UNREAD COUNT
exports.getUnreadCount = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const count = await ContactMessage.count({ where: { isRead: false, isDeleted: false } });
        res.json({ unreadCount: count });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 7. REPLY TO CUSTOMER (Admin sends reply email directly to customer)
exports.replyMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { replySubject, replyMessage } = req.body || {};

        const content = (replyMessage || '').trim();
        if (!content) {
            return res.status(400).json({ success: false, message: "Reply message is required!" });
        }

        const msg = await ContactMessage.findByPk(id);
        if (!msg) {
            return res.status(404).json({ success: false, message: "Message not found!" });
        }

        const subject = (replySubject || '').trim() || `Re: ${msg.subject || 'Enquiry with Baani Jewels'}`;

        const formattedDate = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        const emailBodyHtml = `
            <p style="font-size: 16px; color: #111827; margin-bottom: 16px;">
                Dear <strong>${escapeHtml(msg.name)}</strong>,
            </p>
            <p style="font-size: 15px; color: #374151; margin-bottom: 20px; line-height: 1.6;">
                Thank you for contacting Baani Jewels. Here is our response to your enquiry:
            </p>
            <div style="margin-bottom: 24px; font-size: 15px; line-height: 1.75; color: #1f2937; white-space: pre-wrap;">
                ${escapeHtml(content)}
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 13px; color: #6b7280;">
                <strong style="color: #12382e;">In reference to your original message (${formattedDate}):</strong>
                <div style="margin-top: 8px; font-style: italic; color: #4b5563; line-height: 1.6;">
                    "${escapeHtml(msg.message)}"
                </div>
            </div>
        `;

        const finalEmailHtml = buildThemedEmailHtml({
            title: "Baani Jewels Support",
            intro: `Response to ${msg.name}`,
            body: emailBodyHtml,
            footer: "If you have any further questions, feel free to reply directly to this email or visit our store.",
            ctaText: "Explore Baani Jewels",
            ctaUrl: process.env.FRONTEND_URL || "https://baanijewels.com",
            highlight: "Customer Support"
        });

        await transporter.sendMail({
            from: `"Baani Jewels Support" <${process.env.EMAIL_USER}>`,
            to: msg.email,
            subject: subject,
            html: finalEmailHtml
        });

        console.log(` Reply email sent to customer ${msg.email}`);

        await msg.update({
            isRead: true,
            isReplied: true,
            replySubject: subject,
            replyMessage: content,
            repliedAt: new Date()
        });

        res.json({
            success: true,
            message: `Reply sent successfully to ${msg.name} (${msg.email})!`,
            data: msg
        });
    } catch (err) {
        console.error("Error sending reply email:", err);
        res.status(500).json({ success: false, message: err.message || "Failed to send reply email." });
    }
};
