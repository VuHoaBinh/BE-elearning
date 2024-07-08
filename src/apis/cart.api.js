var express = require('express');
var cartApis = express.Router();
const cartController = require('../controllers/cart.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')


// api: xem giỏ hàng
cartApis.get('/', passport.jwtAuthentication, cartController.getCart)

// api: thêm vào giỏ hàng
cartApis.post('/', passport.jwtAuthentication, cartController.postCart)

// api: cập nhật giỏ hàng
cartApis.put('/:course', passport.jwtAuthentication, cartController.putCart)

// api: xoá khỏi giỏ hàng
cartApis.delete('/:course', passport.jwtAuthentication, cartController.deleteCart)


module.exports = cartApis