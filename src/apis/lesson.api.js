var express = require('express');
var lessonApis = express.Router();
const lessonController = require('../controllers/lesson.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')
const { dontStorageUpload } = require('../configs/storage.config');

lessonApis.post('/upload-file', passport.jwtAuthentication, dontStorageUpload.single('file'), lessonController.uploadFileToCloudinary)
lessonApis.post('/upload-video', passport.jwtAuthentication, dontStorageUpload.single('file'), lessonController.uploadVideoToCloudinary)

// api: thêm khoá học
lessonApis.post('/', passport.jwtAuthentication, lessonController.postLesson)

// api: lấy lesson
lessonApis.get('/:id', passport.jwtAuthentication, lessonController.getLesson)

// api: lấy lessons by chapter id
lessonApis.get('/', passport.jwtAuthentication, lessonController.getLessons)

// api: cập nhật chapter by id
lessonApis.put('/:id', passport.jwtAuthentication, lessonController.isPermitted, lessonController.putLessonTypeVideo)

// api: delete chapters
lessonApis.delete('/:id', passport.jwtAuthentication, lessonController.isPermitted, lessonController.deleteLesson)



module.exports = lessonApis