const { Testimonial } = require('../models');
const fs = require('fs');
const path = require('path');

const getFilePath = (filename) => path.join(process.cwd(), 'uploads', filename);

// 1. ADD TESTIMONIAL
exports.addTestimonial = async (req, res) => {
    try {
        const { name, location, rating, review, status } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }
        if (!review || !review.trim()) {
            return res.status(400).json({ success: false, message: 'Review text is required' });
        }

        // Image is optional
        const image = req.file ? req.file.filename : null;

        const testimonial = await Testimonial.create({
            name: name.trim(),
            location: location ? location.trim() : '',
            rating: parseInt(rating, 10) || 5,
            review: review.trim(),
            image,
            status: status !== undefined ? (status === 'true' || status === true) : true
        });

        res.status(201).json({ success: true, message: 'Testimonial added successfully!', testimonial });
    } catch (e) {
        if (req.file) {
            const tempPath = getFilePath(req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        res.status(500).json({ success: false, error: e.message });
    }
};

// 2. GET ALL TESTIMONIALS (Admin & Public)
exports.getAllTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(testimonials);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// 3. GET ACTIVE TESTIMONIALS (Frontend Home Page)
exports.getActiveTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.findAll({
            where: { status: true },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(testimonials);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// 4. UPDATE TESTIMONIAL
exports.updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const testimonial = await Testimonial.findByPk(id);
        if (!testimonial) {
            return res.status(404).json({ success: false, message: 'Testimonial not found' });
        }

        const { name, location, rating, review, status } = req.body;
        let image = testimonial.image;

        if (req.file) {
            if (testimonial.image) {
                const oldPath = getFilePath(testimonial.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            image = req.file.filename;
        }

        await testimonial.update({
            name: name !== undefined ? name.trim() : testimonial.name,
            location: location !== undefined ? location.trim() : testimonial.location,
            rating: rating !== undefined ? parseInt(rating, 10) : testimonial.rating,
            review: review !== undefined ? review.trim() : testimonial.review,
            image,
            status: status !== undefined ? (status === 'true' || status === true) : testimonial.status
        });

        res.status(200).json({ success: true, message: 'Testimonial updated successfully!', testimonial });
    } catch (e) {
        if (req.file) {
            const tempPath = getFilePath(req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        res.status(500).json({ success: false, error: e.message });
    }
};

// 5. DELETE TESTIMONIAL
exports.deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const testimonial = await Testimonial.findByPk(id);
        if (!testimonial) {
            return res.status(404).json({ success: false, message: 'Testimonial not found' });
        }

        if (testimonial.image) {
            const oldPath = getFilePath(testimonial.image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        await testimonial.destroy();
        res.status(200).json({ success: true, message: 'Testimonial deleted successfully!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
