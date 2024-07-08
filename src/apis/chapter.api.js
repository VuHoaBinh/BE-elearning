var express = require('express');
var chapterApis = express.Router();
const chapterController = require('../controllers/chapter.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')


// api: thêm khoá học
chapterApis.post('/', passport.jwtAuthentication, chapterController.postChapter)

// api: lấy list chapter
chapterApis.get('/', passport.jwtAuthentication, chapterController.getChapters)

// api: cập nhật chapter by id
chapterApis.put('/:id', passport.jwtAuthentication, chapterController.isPermitted, chapterController.putChapter)

// api: delete chapters
chapterApis.delete('/:id', passport.jwtAuthentication, chapterController.isPermitted, chapterController.deleteChapter)

module.exports = chapterApis