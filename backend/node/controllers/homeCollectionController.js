const HomeCollection = require('../models/HomeCollection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Multer storage ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'hcol-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });
exports.upload = upload.single('image');

// GET /api/home-collections/all
exports.getAll = async (req, res) => {
    try {
        const collections = await HomeCollection.findAll({
            where: { status: true },
            order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
        });
        res.json(collections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/home-collections/all-admin  (includes inactive)
exports.getAllAdmin = async (req, res) => {
    try {
        const collections = await HomeCollection.findAll({
            order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
        });
        res.json(collections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/home-collections/add
exports.add = async (req, res) => {
    try {
        const { name, sortOrder, status } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ message: 'Collection name is required.' });
        const image = req.file ? req.file.filename : 'prod-b0001-main.jpg';
        const collection = await HomeCollection.create({
            name: name.trim(),
            image,
            sortOrder: Number(sortOrder) || 0,
            status: status !== 'false' && status !== false
        });
        res.status(201).json(collection);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/home-collections/update/:id
exports.update = async (req, res) => {
    try {
        const col = await HomeCollection.findByPk(req.params.id);
        if (!col) return res.status(404).json({ message: 'Collection not found.' });
        const { name, sortOrder, status } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
        if (status !== undefined) updates.status = (status !== 'false' && status !== false);
        if (req.file) {
            // delete old image
            const old = path.join(__dirname, '../uploads', col.image);
            if (fs.existsSync(old)) fs.unlinkSync(old);
            updates.image = req.file.filename;
        }
        await col.update(updates);
        res.json(col);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/home-collections/delete/:id
exports.remove = async (req, res) => {
    try {
        const col = await HomeCollection.findByPk(req.params.id);
        if (!col) return res.status(404).json({ message: 'Collection not found.' });
        const imgPath = path.join(__dirname, '../uploads', col.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        await col.destroy();
        res.json({ message: 'Deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
