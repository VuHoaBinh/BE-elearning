const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs')
const cookieParser = require('cookie-parser')
var compression = require('compression')

app.use(
  compression({
    level: 6,
    threshold: 100 * 1000,
    filter: (req, res) => {
      if (req.headers['x-no-compress']) {
        return false
      } else {
        return compression.filter(req, res)
      }
    },
  })
)

const swaggerDocument = YAML.load('./swagger.yaml')
const corsConfig = require('./src/configs/cors.config')
const categoryApis = require('./src/apis/category.api')
const courseApis = require('./src/apis/course.api')
const loginApis = require('./src/apis/login.api')
const accountApis = require('./src/apis/account.api')
const chapterApis = require('./src/apis/chapter.api')
const lessonApis = require('./src/apis/lesson.api')
const userApis = require('./src/apis/user.api')
const cartApis = require('./src/apis/cart.api')
const teacherApis = require('./src/apis/teacher.api')
const couponApis = require('./src/apis/coupon.api')
const invoiceApis = require('./src/apis/invoice.api')
const myCourseApis = require('./src/apis/myCourse.api')
const statisticApis = require('./src/apis/statistic.api')
const webConfigApis = require('./src/apis/webConfig.api')
const adminUserApis = require('./src/apis/adminUser.api')
const quizApis = require('./src/apis/quiz.api')
const examApis = require('./src/apis/exam.api')
const blogApis = require('./src/apis/blog.api')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors(corsConfig))
app.use(cookieParser())
app.use(express.static(__dirname + '/src/public'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  return res.sendFile(__dirname + '/index.html')
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use('/api/accounts', accountApis)
app.use('/api/user', userApis)
app.use('/api/teacher', teacherApis)
app.use('/api/carts', cartApis)
app.use('/api/categories', categoryApis)
app.use('/api/courses', courseApis)
app.use('/api/chapters', chapterApis)
app.use('/api/lessons', lessonApis)
app.use('/api/my-courses', myCourseApis)
app.use('/api/coupons', couponApis)
app.use('/api/login', loginApis)
app.use('/api/invoices', invoiceApis)
app.use('/api/admin/users', adminUserApis)
app.use('/api/statistics', statisticApis)
app.use('/api/admin/web-configs', webConfigApis)
app.use('/api/quiz', quizApis)
app.use('/api/exam', examApis)
app.use('/api/blog', blogApis)

app.use((error, req, res, next) => {
  error.status = error.status || 500
  return res.status(error.status).json({
    message: error.message,
  })
})

module.exports = app
