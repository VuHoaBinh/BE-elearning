<<<<<<< HEAD
var express = require('express')
var loginApis = express.Router()
const loginController = require('../controllers/login.controller')
const passportAuth = require('../middlewares/passport.middleware')
=======
var express = require('express');
var loginApis = express.Router();
const loginController = require('../controllers/login.controller')
const passportAuth = require('../middlewares/passport.middleware')
const passport = require('passport');
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda

// api: login
loginApis.post('/', loginController.postLogin)

<<<<<<< HEAD
=======
// api: login with google
loginApis.post('/google', passport.authenticate('google-token', { session: false }), loginController.postLoginWithGoogle)

>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
// api: logout
loginApis.post('/logout', passportAuth.jwtAuthentication, loginController.postLogout)

// api: get new token
loginApis.post('/refresh-token', passportAuth.jwtAuthentication, loginController.postRefreshToken)

<<<<<<< HEAD
module.exports = loginApis
=======

module.exports = loginApis
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
