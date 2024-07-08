<<<<<<< HEAD
var express = require('express')
var userApis = express.Router()
const userController = require('../controllers/user.controller')
const passport = require('../middlewares/passport.middleware')
const accessControl = require('../middlewares/access_control.middleware')
const { dontStorageUpload } = require('../configs/storage.config')
=======
var express = require('express');
var userApis = express.Router();
const userController = require('../controllers/user.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')
const { dontStorageUpload } = require('../configs/storage.config');

>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda

// api: lấy thông tin người dùng hiện tại
userApis.get('/', passport.jwtAuthentication, userController.getUser)

// api: cập nhật thông tin người dùng hiện tại
<<<<<<< HEAD
userApis.put(
  '/',
  passport.jwtAuthentication,
  dontStorageUpload.single('avatar'),
  userController.putUser
)
=======
userApis.put('/', passport.jwtAuthentication, dontStorageUpload.single('avatar'), userController.putUser)
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda

// api: kích hoạt teacher role
userApis.post('/', passport.jwtAuthentication, userController.postActiveTeacherRole)

<<<<<<< HEAD
module.exports = userApis
=======
// api: lấy lịch sử tìm kiếm
userApis.get('/history', passport.jwtAuthentication, userController.getHistorySearchAndView)

// api: lấy lịch sử thanh toán
userApis.get('/invoices', passport.jwtAuthentication, userController.getMyInvoices)

userApis.get('/invoices/:id', passport.jwtAuthentication, userController.getDetailMyInvoices)


module.exports = userApis
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
