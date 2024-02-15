var express = require('express');
var couponApis = express.Router();
const couponController = require('../controllers/coupon.controller')
const passport = require('../middlewares/passport.middleware');

// api: đăng nhập bằng google
couponApis.get('/login-with-google', couponController.postLoginGoogle)

// api: lấy token của google
couponApis.get('/google/callback', couponController.getGoogleCallback)

// api: xuất mã giảm giá ra google sheet
couponApis.post('/export-sheet', passport.jwtAuthentication, couponController.postCreateGoogleSheet)

// api: danh sách mã và phân trang
couponApis.get('/', passport.jwtAuthentication, couponController.getCoupons)

// api: chi tiết mã
couponApis.get('/:id', passport.jwtAuthentication, couponController.getCoupon)

// api: thêm mã
couponApis.post('/', passport.jwtAuthentication, couponController.postCoupon)

// api: cập nhật mã
couponApis.put('/:id', passport.jwtAuthentication, couponController.updateCoupon)

// api: xoá nhiều mã
couponApis.delete('/', passport.jwtAuthentication, couponController.deleteManyCoupon)

// api: xoá mã
couponApis.delete('/:id', passport.jwtAuthentication, couponController.deleteCoupon)


module.exports = couponApis;
