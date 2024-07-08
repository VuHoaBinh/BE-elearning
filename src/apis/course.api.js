var express = require('express');
var courseApis = express.Router();
const courseController = require('../controllers/course.controller');
const { dontStorageUpload } = require('../configs/storage.config');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')

courseApis.post('/upload/image', passport.jwtAuthentication, dontStorageUpload.single('image'), courseController.uploadImageToCloudinary)

// api tạo mới khoá học 
courseApis.post('/', passport.jwtAuthentication, courseController.postCourse)

// api lấy danh sách khoá học
courseApis.get('/', passport.jwtAuthenticationOrNull, courseController.getCourses)

// api lấy danh sách khoá học hot
courseApis.get('/hot', passport.jwtAuthenticationOrNull, courseController.getHotCourses)

// api lấy danh sách khoá học đề xuất
courseApis.get('/suggest', passport.jwtAuthenticationOrNull, courseController.getSuggestCourses)

// api xem chi tiết khoá học theo id
courseApis.get('/:slug', passport.jwtAuthenticationOrNull, courseController.getCourse)

// api lấy danh sách khoá học liên quan theo category
courseApis.get('/:slug/related', passport.jwtAuthenticationOrNull, courseController.getRelatedCourses)

// api cập nhật khoá học theo slug
courseApis.put('/:slug', passport.jwtAuthentication, accessControl.grantAccess('updateOwn', 'course'), courseController.putCourse)

// api: xoá khoá học
courseApis.delete('/:slug', passport.jwtAuthentication, courseController.deleteCourse)

// api: xem chi tiết khoá học đang chờ duyệt
courseApis.get('/check/:slug', passport.jwtAuthentication, passport.isAdmin, courseController.getDetailPendingCourse)

courseApis.post('/upload/image', passport.jwtAuthentication, dontStorageUpload.fields([{ name: 'image' }]), courseController.uploadImage);


module.exports = courseApis