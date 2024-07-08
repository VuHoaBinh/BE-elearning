var express = require('express');
var webConfigApis = express.Router();
const webConfigController = require('../controllers/webConfig.controller');
const passport = require('../middlewares/passport.middleware');

// api: lấy thông tin web configs
webConfigApis.get('/', passport.jwtAuthentication, passport.isAdmin, webConfigController.getWebConfig)

// api: cập nhật thông tin web configs
webConfigApis.put('/', passport.jwtAuthentication, passport.isAdmin, webConfigController.putWebConfig)

module.exports = webConfigApis