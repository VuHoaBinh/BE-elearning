var express = require('express')
var myCourseApis = express.Router()
const myCourseController = require('../controllers/myCourse.controller')
const passport = require('../middlewares/passport.middleware')

// api: tham gia khóa học
myCourseApis.post('/', passport.jwtAuthentication, myCourseController.postMyCourse)

// api: phân trang danh sách khoá học đã mua
myCourseApis.get('/', passport.jwtAuthentication, myCourseController.getMyCourses)

// api: chi tiết bài giảng khoá học đã mua
myCourseApis.get('/:id', passport.jwtAuthentication, myCourseController.getMyCourse)

// api: cập nhật tiến độ các bài học trong khoá học
myCourseApis.put('/:id', passport.jwtAuthentication, myCourseController.putProgress)

module.exports = myCourseApis
