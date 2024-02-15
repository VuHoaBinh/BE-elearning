var express = require('express');
var accountApi = express.Router();
const accountController = require('../controllers/account.controller')
const passportAuth = require('../middlewares/passport.middleware')

// #region =========== CLIENT =============

// api: gửi mã xác thực để đăng ký tài khoản
accountApi.post('/verify', accountController.postSendVerifyCode)

// api: đăng ký tài khoản
accountApi.post('/signup', accountController.postSignup)

// api: gửi mã xác thực để reset mật khẩu
accountApi.post('/verify/forgot', accountController.postSendCodeResetPassword)

// api: reset mật khẩu
accountApi.post('/forgot-pw', accountController.postResetPassword)

// api: đổi mật khẩu
accountApi.post('/change-pw', passportAuth.jwtAuthentication, accountController.postChangePassword)

// #endregion



module.exports = accountApi