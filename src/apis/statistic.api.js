var express = require('express')
var statisticApis = express.Router()
const statisticController = require('../controllers/statistic.controller')
const passport = require('../middlewares/passport.middleware')
const accessControl = require('../middlewares/access_control.middleware')

// api: lấy doanh thu từ ngày a đến b tính theo ngày hoặc tháng
statisticApis.get(
  '/revenues/daily',
  passport.jwtAuthentication,
  statisticController.getDailyRevenue
)

// api: lấy thông doanh thu theo tháng
statisticApis.get(
  '/revenues/monthly/:year',
  passport.jwtAuthentication,
  statisticController.getMonthlyRevenue
)

// api: lấy thông tin doanh thu theo năm
statisticApis.get(
  '/revenues/yearly',
  passport.jwtAuthentication,
  statisticController.getYearlyRevenue
)

module.exports = statisticApis
