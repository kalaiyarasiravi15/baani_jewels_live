const Banner = require('../models/Banner');
const fs = require('fs');
const path = require('path');

const getFilePath = (filename) => path.join(process.cwd(), 'uploads', filename);

// 1. ADD BANNER
exports.addBanner = async (req, res) => {
    try {
        const { title, subtitle, description, buttonText, link, status } = req.body;
        const image = req.files && req.files['image'] ? req.files['image'][0].filename : null;
        const secondaryImage = req.files && req.files['secondaryImage'] ? req.files['secondaryImage'][0].filename : null;

        if (!image) {
            return res.status(400).json({ message: "Main image required!" });
        }

        const banner = await Banner.create({ 
            title, 
            subtitle, 
            description,
            buttonText, 
            image, 
            secondaryImage,
            link,
            status: status !== undefined ? (status === 'true' || status === true) : true
        });

        res.status(201).json({ message: "Banner Added Successfully!", banner });
    } catch (e) {
        if (req.files) {
            if (req.files['image']) {
                const tempPath = getFilePath(req.files['image'][0].filename);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }
            if (req.files['secondaryImage']) {
                const tempPath2 = getFilePath(req.files['secondaryImage'][0].filename);
                if (fs.existsSync(tempPath2)) fs.unlinkSync(tempPath2);
            }
        }
        res.status(500).json({ error: e.message });
    }
};

// 2. GET ALL BANNERS
exports.getBanners = async (req, res) => {
    try {
        const isAdmin = Boolean(req.adminId);
        const query = { order: [['createdAt', 'DESC']] };
        if (!isAdmin) {
            query.where = { status: true };
        }
        const banners = await Banner.findAll(query);
        res.json(banners);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// 3. GET SINGLE BANNER
exports.getSingleBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });
        res.json(banner);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// 4. UPDATE BANNER
exports.updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });

        const { title, subtitle, description, buttonText, link, status } = req.body;
        let imageName = banner.image;
        let secondaryImageName = banner.secondaryImage;

        if (req.files) {
            if (req.files['image']) {
                const oldPath = getFilePath(banner.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                imageName = req.files['image'][0].filename;
            }
            if (req.files['secondaryImage']) {
                if (banner.secondaryImage) {
                    const oldSecPath = getFilePath(banner.secondaryImage);
                    if (fs.existsSync(oldSecPath)) fs.unlinkSync(oldSecPath);
                }
                secondaryImageName = req.files['secondaryImage'][0].filename;
            }
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (subtitle !== undefined) updateData.subtitle = subtitle;
        if (description !== undefined) updateData.description = description;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        if (link !== undefined) updateData.link = link;
        if (status !== undefined) updateData.status = (status === 'true' || status === true);
        if (imageName) updateData.image = imageName;
        if (secondaryImageName) updateData.secondaryImage = secondaryImageName;

        await banner.update(updateData);

        res.json({ message: "Banner Updated Successfully!", banner });
    } catch (e) {
        if (req.files) {
            if (req.files['image']) {
                const tempPath = getFilePath(req.files['image'][0].filename);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }
            if (req.files['secondaryImage']) {
                const tempPath2 = getFilePath(req.files['secondaryImage'][0].filename);
                if (fs.existsSync(tempPath2)) fs.unlinkSync(tempPath2);
            }
        }
        res.status(500).json({ error: e.message });
    }
};

// 5. DELETE BANNER
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });

     
        const imgPath = getFilePath(banner.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

        if (banner.secondaryImage) {
            const secImgPath = getFilePath(banner.secondaryImage);
            if (fs.existsSync(secImgPath)) fs.unlinkSync(secImgPath);
        }

        await banner.destroy();
        res.json({ message: "Banner Deleted Permanently!" });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};
