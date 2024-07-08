<<<<<<< HEAD
var express = require('express')
var teacherApis = express.Router()
const teacherController = require('../controllers/teacher.controller')
const passport = require('../middlewares/passport.middleware')
const accessControl = require('../middlewares/access_control.middleware')

=======
var express = require('express');
var teacherApis = express.Router();
const teacherController = require('../controllers/teacher.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')


>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
// api: lấy thông tin khoá học đã tạo
teacherApis.get('/courses', passport.jwtAuthentication, teacherController.getMyCourses)

// api: lấy chi tiết khoá học (chapter & lessons) để xem
teacherApis.get('/courses/:id', passport.jwtAuthentication, teacherController.getDetailMyCourse)

// api: lấy thông tin teacher
teacherApis.get('/info/:id', teacherController.getMyInfo)

// api: cập nhật thông tin teacher
teacherApis.put('/info/:id', passport.jwtAuthentication, teacherController.putMyInfo)

// api: lấy thông tin doanh thu theo tháng
teacherApis.get('/my-revenue', passport.jwtAuthentication, teacherController.getMyRevenue)

<<<<<<< HEAD
module.exports = teacherApis
=======
// api: lấy danh sách điểm các học sinh đã làm bài kiểm tra theo lesson id
teacherApis.get('/lesson/:id/exams', teacherController.getScoreExamOfStudentByLessonId)


module.exports = teacherApis
>>>>>>> 1fd8259f43ec7cf4f04b0dbe5db9559277f79dda
