var express = require('express');
var quizApis = express.Router();
const quizController = require('../controllers/quiz.controller');
const passport = require('../middlewares/passport.middleware');

quizApis.get('/', passport.jwtAuthentication, quizController.getAllQuizByLessonId);
quizApis.post('/create-bulk', passport.jwtAuthentication, passport.isTeacher, quizController.createBulkQuiz);
quizApis.put('/:id', passport.jwtAuthentication, passport.isTeacher, quizController.updateQuizById);
quizApis.delete('/:id', passport.jwtAuthentication, passport.isTeacher, quizController.deleteQuizById);
quizApis.delete('/', passport.jwtAuthentication, passport.isTeacher, quizController.deleteManyQuizByIds);

module.exports = quizApis;