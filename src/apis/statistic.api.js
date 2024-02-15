var express = require('express');
var statisticApis = express.Router();
const statisticController = require('../controllers/statistic.controller');
const passport = require('../middlewares/passport.middleware');
const accessControl = require('../middlewares/access_control.middleware')


// api: top giáo viên có số lượng bán/doanh thu cao nhất trong năm
statisticApis.get('/top-teachers-of-year', passport.jwtAuthentication, statisticController.getTopYearTeachers)

// api: top giáo viên có số lượng bán/doanh thu cao nhất các tháng trong năm
statisticApis.get('/top-teachers-of-months', passport.jwtAuthentication, statisticController.getTopMonthlyTeachers)

// api: lấy doanh thu từ ngày a đến b tính theo ngày hoặc tháng
statisticApis.get('/revenues/daily', passport.jwtAuthentication, statisticController.getDailyRevenue)

// api: lấy thông doanh thu theo tháng 
statisticApis.get('/revenues/monthly/:year', passport.jwtAuthentication, statisticController.getMonthlyRevenue)

// api: lấy thông tin doanh thu theo năm
statisticApis.get('/revenues/yearly', passport.jwtAuthentication, statisticController.getYearlyRevenue)

// api: thống kê số lượng người dùng theo các năm
statisticApis.get('/users/yearly', passport.jwtAuthentication, statisticController.getCountUsersByYear)

// api: thống kê số lượng người dùng theo các tháng trong năm
statisticApis.get('/users/monthly', passport.jwtAuthentication, statisticController.getCountUsersByMonth)

// api: thống kê số lượng khoá học 
statisticApis.get('/courses', passport.jwtAuthentication, statisticController.getCountCourses)

// api: thống kê số lượng bán khoá học ở năm x
statisticApis.get('/top-sale-courses/year', passport.jwtAuthentication, statisticController.getTopSaleCoursesOfYear)

// api: thống kê số lượng bán khoá học ở tháng y năm x
statisticApis.get('/top-sale-courses/month', passport.jwtAuthentication, statisticController.getTopSaleCoursesOfMonth)

// api: thống kê số lượng mã giảm giá
statisticApis.get('/coupons', passport.jwtAuthentication, statisticController.getCountCoupons)

// api: thống kê doanh thu của các giảng viên theo tháng
statisticApis.get('/revenues/teachers', passport.jwtAuthentication, statisticController.getTeachersRevenueByMonth)

// api: thống kê lương chi tiết của giáo viên
statisticApis.get('/revenues/teachers/:id', passport.jwtAuthentication, statisticController.getDetailTeachersRevenue)


module.exports = statisticApis