var express = require('express')
var loginApis = express.Router()
const loginController = require('../controllers/login.controller')
const passportAuth = require('../middlewares/passport.middleware')

// api: login
loginApis.post('/', loginController.postLogin)

// api: logout
loginApis.post('/logout', passportAuth.jwtAuthentication, loginController.postLogout)

// api: get new token
loginApis.post('/refresh-token', passportAuth.jwtAuthentication, loginController.postRefreshToken)

module.exports = loginApis
