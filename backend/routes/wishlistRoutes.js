/**
 * Wishlist Routes
 * Định tuyến cho danh sách sản phẩm yêu thích
 */

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, wishlistController.getWishlist);
router.post('/add', authenticate, wishlistController.addWishlistItem);
router.delete('/remove/:productId', authenticate, wishlistController.removeWishlistItem);
router.get('/check/:productId', authenticate, wishlistController.checkWishlistItem);

module.exports = router;
