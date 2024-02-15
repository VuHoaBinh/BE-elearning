var express = require('express');
var examApis = express.Router();
const passport = require('../middlewares/passport.middleware');
const examController = require('../controllers/exam.controller');

examApis.post('/', passport.jwtAuthentication, examController.postExam)
examApis.get('/', passport.jwtAuthentication, examController.getExamByLessonAndUserId)

module.exports = examApis