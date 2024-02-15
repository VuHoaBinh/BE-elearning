var express = require('express');
var loginApis = express.Router();
const loginController = require('../controllers/login.controller')
const passportAuth = require('../middlewares/passport.middleware')
const passport = require('passport');

// api: login
loginApis.post('/', loginController.postLogin)

// api: login with google
loginApis.post('/google', passport.authenticate('google-token', { session: false }), loginController.postLoginWithGoogle)

// api: logout
loginApis.post('/logout', passportAuth.jwtAuthentication, loginController.postLogout)

// api: get new token
loginApis.post('/refresh-token', passportAuth.jwtAuthentication, loginController.postRefreshToken)


module.exports = loginApis