const multer = require('multer');
const path = require('path');
const fs = require('fs');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// 10MB Limit for images
const limits = { fileSize: 10 * 1024 * 1024 };

// 100MB Limit for products (includes brochures)
const productLimits = { fileSize: 100 * 1024 * 1024 };

const baseMulter = multer({ storage, limits });

// Brochure file filter — only allow documents
const brochureFileFilter = (req, file, cb) => {
    if (file.fieldname === 'brochures') {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExts = ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Brochure files must be PDF, TXT, DOC, DOCX, XLS, or XLSX'), false);
        }
    } else {
        cb(null, true);
    }
};

// Product upload multer with brochure support (20MB limit)
const productMulter = multer({ 
    storage, 
    limits: productLimits,
    fileFilter: brochureFileFilter
});

// Define Upload Types
const rawUpload = baseMulter.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'thumbnails', maxCount: 7 }
]);

const rawDealUpload = baseMulter.single('image');
const rawCategoryUpload = baseMulter.single('image');
const rawThumbnailUpload = baseMulter.array('thumbnails', 7);
const rawBannerUpload = baseMulter.fields([
    { name: 'image', maxCount: 1 },
    { name: 'secondaryImage', maxCount: 1 }
]);

// Product upload accepts dynamic fields for variant main images, variant thumbnails, mainImage, thumbnails, and thumbVideo
const rawProductUpload = productMulter.any();

const rawBlogUpload = baseMulter.single('image');
const rawTestimonialUpload = baseMulter.single('image');

const reviewStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, 'review-' + require('crypto').randomUUID() + path.extname(file.originalname).toLowerCase())
});
const rawReviewUpload = multer({
    storage: reviewStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 5 },
    fileFilter: (req, file, cb) => {
        const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
        if (types[path.extname(file.originalname).toLowerCase()] === file.mimetype) return cb(null, true);
        cb(new Error('Use JPG, PNG, WebP images or MP4, WebM videos (up to 10 MB each).'));
    }
}).array('images', 5);
const rawSettingUpload = baseMulter.fields([{ name: 'images', maxCount: 1 }]);
const rawContactUpload = baseMulter.single('image');
const bulkProductFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) return cb(null, true);
    cb(new Error('Upload an Excel (.xlsx, .xls) or CSV file.'), false);
};
const rawBulkProductUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: bulkProductFileFilter }).single('file');

const handleMulterError = (uploadFunction) => (req, res, next) => {
    uploadFunction(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File size is too large. Maximum 10MB allowed." });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message || "Internal Server Error during upload." });
        }

        next();
    });
};

module.exports = { 
    upload: handleMulterError(rawUpload), 
    dealUpload: handleMulterError(rawDealUpload),
    categoryUpload: handleMulterError(rawCategoryUpload), 
    bannerUpload: handleMulterError(rawBannerUpload),
    thumbnailUpload: handleMulterError(rawThumbnailUpload), 
    productUpload: handleMulterError(rawProductUpload),
    blogUpload: handleMulterError(rawBlogUpload),
    testimonialUpload: handleMulterError(rawTestimonialUpload),
    reviewUpload: handleMulterError(rawReviewUpload),
    settingUpload: handleMulterError(rawSettingUpload),
    contactUpload: handleMulterError(rawContactUpload),
    bulkProductUpload: handleMulterError(rawBulkProductUpload)
};
