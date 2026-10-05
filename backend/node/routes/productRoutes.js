const express = require('express');
const router  = express.Router();
const productController = require('../controllers/productController');
const { productUpload, bulkProductUpload } = require('../middleware/upload');

router.post('/add',                       productUpload, productController.createProduct);
router.post('/bulk-preview',              bulkProductUpload, productController.previewBulkProducts);
router.post('/bulk-import',               productController.importBulkProducts);
router.get('/by-category/:categoryId',                  productController.getProductsByCategory);
router.get('/all',                                       productController.getAllProducts);

router.get('/slug/:slug',                               productController.getProductBySlug);
router.get('/:id',                                       productController.getProductById);
router.put('/update-stock',                             productController.updateStock);
router.put('/update/:id',                 productUpload, productController.updateProduct);
router.delete('/delete/:id',                            productController.deleteProduct);

module.exports = router;
