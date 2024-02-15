var express = require('express');
var userApis = express.Router();
const userController = require('../controllers/user.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')
const { dontStorageUpload } = require('../configs/storage.config');


// api: lấy thông tin người dùng hiện tại
userApis.get('/', passport.jwtAuthentication, userController.getUser)

// api: cập nhật thông tin người dùng hiện tại
userApis.put('/', passport.jwtAuthentication, dontStorageUpload.single('avatar'), userController.putUser)

// api: kích hoạt teacher role
userApis.post('/', passport.jwtAuthentication, userController.postActiveTeacherRole)

// api: lấy lịch sử tìm kiếm
userApis.get('/history', passport.jwtAuthentication, userController.getHistorySearchAndView)

// api: lấy lịch sử thanh toán
userApis.get('/invoices', passport.jwtAuthentication, userController.getMyInvoices)

userApis.get('/invoices/:id', passport.jwtAuthentication, userController.getDetailMyInvoices)


module.exports = userApis