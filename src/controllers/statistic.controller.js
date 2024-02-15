const CouponModel = require('../models/coupon.model')
const CourseModel = require('../models/courses/course.model')
const InvoiceModel = require('../models/invoice.model')
const UserModel = require('../models/users/user.model')
var xlsx = require('node-xlsx').default
var fs = require('fs')
const AccountModel = require('../models/users/account.model')
const DetailInvoiceModel = require('../models/detailInvoice.model')
const _ = require('lodash')
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

// fn: thống kê doanh thu từ ngày a đến b
const getDailyRevenue = async (req, res) => {
  try {
    // type = 'day', 'month'
    let now = Date.now()
    let oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 2)).getTime()
    let { start = oneMonthAgo, end = now, type = 'day', exports = 'false' } = req.query
    let startDate = new Date(parseInt(start))
    let endDate = new Date(parseInt(end))

    // tính khoản cách giữa 2 ngày
    let numberOfDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000))
    if (numberOfDays > 31) {
      type = 'month'
    }

    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          status: 'Paid',
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%d',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
    ])
    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice
      // i.paymentPrice = i.paymentPrice * 0.2
      return i
    })

    var result = null
    var preResult = null
    if (type.toLowerCase().trim() == 'day') {
      let differenceInTime = endDate.getTime() - startDate.getTime()
      let differenceInDays = differenceInTime / (1000 * 3600 * 24)
      result = {}
      preResult = []
      let startDateISO = new Date(startDate)
      for (let i = 0; i < differenceInDays + 1; i++) {
        let startDateString = startDateISO.toISOString().split('T')[0]
        preResult.push({ date: startDateString, value: 0 })
        result[startDateString] = 0
        startDateISO.setDate(startDateISO.getDate() + 1)
      }
      // tính doanh thu mỗi ngày
      preResult.forEach((item) => {
        invoices.forEach((invoice) => {
          let dateString = invoice.createdAt
          if (item.date == dateString) {
            item.value += invoice.paymentPrice
          }
        })
      })
      invoices.forEach((invoice) => {
        let dateString = invoice.createdAt
        result[dateString] += invoice.paymentPrice
      })
    } else if (type.toLowerCase().trim() == 'month') {
      startMonth = startDate.getMonth()
      startYear = startDate.getFullYear()
      endMonth = endDate.getMonth()
      endYear = endDate.getFullYear()

      let numOfMonth = (endYear - startYear - 1) * 12 + 12 - startMonth + 1 + endMonth
      result = {}
      preResult = []
      for (let i = 0; i < numOfMonth; i++) {
        let dateString = startDate.toISOString().slice(0, 7)
        preResult.push({ date: dateString, value: 0 })
        result[dateString] = 0
        startDate.setMonth(startDate.getMonth() + 1)
      }
      // tính doanh thu mỗi tháng
      preResult.forEach((item) => {
        invoices.forEach((invoice) => {
          let dateString = invoice.createdAt.slice(0, 7)
          if (item.date == dateString) {
            item.value += invoice.paymentPrice
          }
        })
      })
      invoices.forEach((invoice) => {
        let dateString = invoice.createdAt.slice(0, 7)
        result[dateString] += invoice.paymentPrice
      })
    }
    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [
          `BẢNG THỐNG KÊ DOANH THU THEO ${type == 'day' ? 'NGÀY' : 'THÁNG'} TỪ ${
            startDate.toISOString().split('T')[0]
          } ĐẾN ${endDate.toISOString().split('T')[0]}`,
        ],
        [`${type == 'day' ? 'NGÀY' : 'THÁNG'}`, `Doanh thu (vnđ)`],
      ]
      for (const key in result) {
        data.push([key, result[key]])
      }
      const range = { s: { c: 0, r: 0 }, e: { c: 10, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê doanh thu', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-doanh-so-theo-ngay.xlsx').write(buffer)
      return res.status(200).json({
        message: 'ok',
        result: preResult,
        file: '/statistics/thong-ke-doanh-so-theo-ngay.xlsx',
      })
    }

    res.status(200).json({ message: 'ok', result: preResult })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê doanh thu theo tháng trong năm x và so sánh vs năm x -1
const getMonthlyRevenue = async (req, res, next) => {
  try {
    var { year } = req.params
    var { exports = 'false', number = 0 } = req.query
    number = parseInt(number)
    year = parseInt(year)

    // lấy danh sách hoá đơn đã thanh toán trong năm year và năm year - 1
    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year - number}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
          status: 'Paid',
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%d',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
    ])
    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice
      // i.paymentPrice = i.paymentPrice * 0.2
      return i
    })

    // doanh thu mỗi tháng
    var result = Array(number + 1).fill(Array(12).fill(0))
    result = JSON.stringify(result)
    result = JSON.parse(result)
    // tính toán doanh thu mỗi tháng
    invoices.forEach((item) => {
      const m = new Date(item.createdAt).getMonth()
      const y = new Date(item.createdAt).getFullYear()
      result[y - year + number][m] += item.paymentPrice
    })
    let preResult = result.map((item, index) => {
      item = { year: year + index - result.length + 1, data: item }
      return item
    })

    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ DOANH THU NĂM ${year - number} - ${year}`],
        [
          null,
          'Tháng 1',
          'Tháng 2',
          'Tháng 3',
          'Tháng 4',
          'Tháng 5',
          'Tháng 6',
          'Tháng 7',
          'Tháng 8',
          'Tháng 9',
          'Tháng 10',
          'Tháng 11',
          'Tháng 12',
        ],
      ]
      for (let i = 0; i < result.length; i++) {
        data.push([`Năm ${year - number + i}`, ...result[i]])
      }

      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê doanh thu', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-doanh-so-theo-thang.xlsx').write(
        buffer
      )
      return res.status(200).json({
        message: 'ok',
        result: preResult,
        file: '/statistics/thong-ke-doanh-so-theo-thang.xlsx',
      })
    }

    res.status(200).json({ message: 'ok', result: preResult })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: doanh thu theo năm
const getYearlyRevenue = async (req, res) => {
  try {
    const {
      start = new Date().getFullYear() - 1,
      end = new Date().getFullYear(),
      exports = 'false',
    } = req.query

    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${start}-01-01`),
            $lte: new Date(`${end}-12-31`),
          },
          status: 'Paid',
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%d',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
    ])

    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice
      // i.paymentPrice = i.paymentPrice * 0.2
      return i
    })

    var result = [...Array(parseInt(end) - parseInt(start) + 1).fill(0)]

    invoices.forEach((item) => {
      const index = new Date(item.createdAt).getFullYear() - parseInt(start)
      result[index] += item.paymentPrice
    })

    let preResult = result.map((item, index) => {
      item = { year: parseInt(start) + index, data: item }
      return item
    })

    let raise = (result[parseInt(end) - parseInt(start)] * 100) / result[0] - 100

    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ DOANH THU TỪ NĂM ${start} - ${end}`],
        ['Năm'],
        [
          `Doanh thu`,
          ...result,
          `Doanh thu ${end} ${raise >= 0 ? 'tăng' : 'giảm'} ${Math.abs(
            raise
          )}% so với năm ${start}`,
        ],
      ]
      for (let i = parseInt(start); i < parseInt(end) + 1; i++) {
        data[1].push(i)
      }
      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê doanh thu', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-doanh-so-theo-nam.xlsx').write(buffer)
      return res.status(200).json({
        message: 'ok',
        result: preResult,
        file: '/statistics/thong-ke-doanh-so-theo-nam.xlsx',
      })
    }
    res.status(200).json({ message: 'ok', result: preResult })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê user mới theo năm
const getCountUsersByYear = async (req, res, next) => {
  try {
    var {
      start = new Date().getFullYear(),
      end = new Date().getFullYear(),
      exports = 'false',
    } = req.query
    start = parseInt(start)
    end = parseInt(end)

    let newUsers = []
    let result = []

    for (let i = 0; i <= end - start; i++) {
      let year = start + i
      const news = await AccountModel.find({
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      }).count()
      newUsers[i] = news
      result[i] = { year: year, value: news }
    }
    let raise = (newUsers[end - start] * 100) / newUsers[0] - 100 || 0

    const activating = await AccountModel.find({ isActive: true }).count()
    const notActivating = await AccountModel.find({ isActive: false }).count()

    if (exports.toLowerCase() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ NGƯỜI DÙNG TỪ NĂM ${start} ĐẾN ${end}`],
        ['Năm'],
        [],
        [null, 'Số lượng'],
        ['Tổng người dùng đang hoạt động', activating],
        ['Tổng người đang bị khoá', notActivating],
        ['Tổng người dùng', activating + notActivating],
      ]
      for (let i = 0; i <= end - start; i++) {
        data[1].push(start + i)
      }
      if (end > start && raise != Infinity) {
        data.splice(2, 0, [
          'Người dùng mới',
          ...newUsers,
          `${raise.toFixed(1)}% so với năm ${start}`,
        ])
      } else {
        data.splice(2, 0, ['Người dùng mới', ...newUsers])
      }
      const range = { s: { c: 0, r: 0 }, e: { c: end - start + 1, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê người dùng', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-user.xlsx').write(buffer)
      res.status(200).json({
        message: 'ok',
        raise,
        newUsers: result,
        activating,
        notActivating,
        file: '/statistics/thong-ke-user.xlsx',
      })
      return
    }
    res.status(200).json({ message: 'ok', raise, newUsers: result, activating, notActivating })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê user mới theo các tháng
const getCountUsersByMonth = async (req, res, next) => {
  try {
    var { year = new Date().getFullYear(), exports = 'false' } = req.query
    year = parseInt(year)

    let thisYear = [...Array(12).fill(0)]
    let lastYear = [...Array(12).fill(0)]

    const activating = await AccountModel.find({ isActive: true }).count()
    const notActivating = await AccountModel.find({ isActive: false }).count()

    let users = await UserModel.aggregate([
      {
        $project: {
          createdAt: 1,
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
      },
      {
        $match: {
          $or: [{ year: year }, { year: year - 1 }],
        },
      },
    ])
    for (let i = 0; i <= 11; i++) {
      let count = users.filter((item) => {
        if (item.month == i + 1 && item.year == year) {
          return true
        }
      }).length
      thisYear[i] = count
      count = users.filter((item) => {
        if (item.month == i + 1 && item.year == year - 1) {
          return true
        }
      }).length
      lastYear[i] = count
    }

    var result = [
      { year, data: thisYear },
      { year: year - 1, data: lastYear },
    ]

    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ NGƯỜI DÙNG MỚI THEO THÁNG TRONG NĂM ${year - 1} VÀ ${year}`],
        ['Năm'],
        [`${year - 1}`, ...lastYear],
        [`${year}`, ...thisYear],
        [],
        [null, 'Số lượng'],
        ['Tổng người dùng đang hoạt động', activating],
        ['Tổng người đang bị khoá', notActivating],
        ['Tổng người dùng', activating + notActivating],
      ]
      for (let i = 1; i <= 12; i++) {
        data[1].push(`Tháng ${i}`)
      }
      const range = { s: { c: 0, r: 0 }, e: { c: 13, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê người dùng', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-user.xlsx').write(buffer)
      res
        .status(200)
        .json({ message: 'ok', thisYear, lastYear, file: '/statistics/thong-ke-user.xlsx' })
      return
    }

    res.status(200).json({ message: 'ok', result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê số lượng khoá học
const getCountCourses = async (req, res, next) => {
  try {
    // khoá học đang publish
    const publishCourse = await CourseModel.find({ publish: true }).count()
    // khoá học đang chờ duyệt
    const pendingCourse = await CourseModel.find({ status: 'pending' }).count()
    res.status(200).json({ message: 'ok', publishCourse, pendingCourse })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê top số lượng bán của khoá học trong 1 năm
const getTopSaleCoursesOfYear = async (req, res, next) => {
  try {
    const { top = 5, year = new Date().getFullYear(), exports = 'false' } = req.query
    let query = [
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { courseId: '$courseId' },
          courseName: { $first: '$courseName' },
          courseSlug: { $first: '$courseSlug' },
          count: { $count: {} },
        },
      },
      {
        $project: {
          courseId: 1,
          courseName: 1,
          courseSlug: 1,
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(top) },
    ]
    // group theo id va month
    const detailInvoices = await DetailInvoiceModel.aggregate(query)
    // làm sạch data
    const result = detailInvoices.map((item) => {
      item._id = item._id.courseId
      return item
    })
    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ TOP ${top} KHOÁ HỌC CÓ SỐ LƯỢNG BÁN TRONG NĂM ${year}`],
        [`Top`, 'Khoá học', 'số lượng bán'],
      ]
      result.forEach((item, index) => {
        data.push([
          index + 1,
          `=HYPERLINK('${process.env.FRONTEND_URL}/courses/${item.courseSlug}','${item.courseName}' )`,
          item.count,
        ])
      })

      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê khoá học', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-top-khoa-hoc.xlsx').write(buffer)
      return res
        .status(200)
        .json({ message: 'ok', result, file: '/statistics/thong-ke-top-khoa-hoc.xlsx' })
    }
    res.status(200).json({ message: 'ok', result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê top số lượng bán của khoá học trong 1 tháng
const getTopSaleCoursesOfMonth = async (req, res, next) => {
  try {
    const {
      top = 5,
      year = new Date().getFullYear(),
      month = new Date().getMonth() + 1,
      exports = 'false',
    } = req.query
    let query = [
      {
        $project: {
          courseId: 1,
          courseName: 1,
          createdAt: 1,
          couponCode: 1,
          courseSlug: 1,
          discount: 1,
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
      },
      {
        $match: {
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      {
        $group: {
          _id: { courseId: '$courseId' },
          courseName: { $first: '$courseName' },
          courseSlug: { $first: '$courseSlug' },
          count: { $count: {} },
        },
      },
      {
        $project: {
          courseId: 1,
          courseName: 1,
          courseSlug: 1,
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(top) },
    ]
    // group theo id va month
    const detailInvoices = await DetailInvoiceModel.aggregate(query)

    const result = detailInvoices.map((item) => {
      item._id = item._id.courseId
      return item
    })

    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ TOP ${top} KHOÁ HỌC CÓ SỐ LƯỢNG BÁN TRONG THÁNG ${month}-${year}`],
        ['Top', 'Khoá học', 'Số lượng bán'],
      ]
      result.forEach((item, index) => {
        data.push([
          index + 1,
          `=HYPERLINK('${process.env.FRONTEND_URL}/courses/${item.courseSlug}','${item.courseName}' )`,
          item.count,
        ])
      })

      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê khoá học', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-top-khoa-hoc.xlsx').write(buffer)
      return res
        .status(200)
        .json({ message: 'ok', result, file: '/statistics/thong-ke-top-khoa-hoc.xlsx' })
    }
    res.status(200).json({ message: 'ok', result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê mã giảm giá
const getCountCoupons = async (req, res, next) => {
  try {
    const { active, countdown } = req.query

    let query = {}

    if (active) {
      if (active == 'true') {
        query.expireDate = { $gte: new Date() }
        query.startDate = { $lte: new Date() }
      } else {
        query.expireDate = { $lte: new Date() }
      }
    }

    if (countdown) {
      if (countdown == 'true') {
        query.startDate = { $gte: new Date() }
      } else {
        query.startDate = { $lte: new Date() }
      }
    }

    const total = await CouponModel.find(query).count()
    res.status(200).json({ message: 'ok', total })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê doanh thu của các giảng viên theo tháng
const getTeachersRevenueByMonth = async (req, res, next) => {
  try {
    const {
      email,
      page,
      limit,
      sort,
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      exports = 'false',
    } = req.query
    let query = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $unwind: '$account',
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacherInfo',
        },
      },
      {
        $unwind: {
          path: '$teacherInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'account.role': 'teacher',
        },
      },
      {
        $project: {
          fullName: 1,
          phone: 1,
          account: { email: 1, role: 1 },
          teacherInfo: { payments: { accountNumber: 1, cardNumber: 1, name: 1, bankName: 1 } },
        },
      },
    ]
    if (email) {
      query.push({ $match: { 'account.email': new RegExp(email, 'igm') } })
    }
    // lấy data teacher
    const teachers = await UserModel.aggregate(query)
    // mảng users id
    const userIds = teachers.map((i) => ObjectId(i._id))

    // lấy hoá đơn có tác giả in users id và được tạo vào tháng month năm year
    var invoices = await DetailInvoiceModel.aggregate([
      {
        $project: {
          amount: 1,
          courseAuthor: 1,
          createdAt: 1,
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
      },
      {
        $match: {
          courseAuthor: { $in: userIds },
          year: parseInt(year),
          month: parseInt(month),
        },
      },
    ])
    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.amount = i.amount * 0.8
      return i
    })

    var result = teachers.map((item) => {
      item.revenue = 0
      item.numOfDetailInvoice = 0
      for (let i = 0; i < invoices.length; i++) {
        const element = invoices[i]
        if (JSON.stringify(item._id) == JSON.stringify(element.courseAuthor)) {
          item.revenue += element.amount
          item.numOfDetailInvoice++
        }
      }
      return item
    })
    result = result.filter((item) => item.revenue > 0)
    let total = result.length
    if (sort) {
      let [f, v] = sort.split('-')
      result = _.orderBy(result, [f], [v])
    }
    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ HOA HỒNG CỦA GIÁO VIÊN THÁNG ${month}-${year}`],
        ['Email', 'Tên', 'STK', 'Tên', 'Ngân hàng', 'Số tiền (VNĐ)'],
      ]
      result.forEach((teacher) => {
        let info = [
          teacher.account.email,
          teacher.fullName,
          teacher.teacherInfo?.payments.accountNumber || null,
          teacher.teacherInfo?.payments.name || null,
          teacher.teacherInfo?.payments.bankName || null,
          teacher.revenue,
        ]
        data.push(info)
      })

      const range = { s: { c: 0, r: 0 }, e: { c: 13, r: 0 } } // A1:A4
      const sheetOptions = { '!merges': [range] }
      var buffer = xlsx.build([{ name: 'Thống kê hoa hồng theo tháng', data: data }], {
        sheetOptions,
      }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/thong-ke-hoa-hong-theo-thang.xlsx').write(
        buffer
      )
      res.status(200).json({
        message: 'ok',
        total,
        result,
        file: '/statistics/thong-ke-hoa-hong-theo-thang.xlsx',
      })
      return
    }

    res.status(200).json({ message: 'ok', total, result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: thống kê doanh thu của giảng viên
const getDetailTeachersRevenue = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      exports = 'fasle',
    } = req.query

    let query = [
      {
        $match: {
          _id: ObjectId(id),
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $unwind: '$account',
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacherInfo',
        },
      },
      {
        $unwind: {
          path: '$teacherInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          fullName: 1,
          phone: 1,
          birthday: 1,
          gender: 1,
          account: { email: 1, role: 1 },
          teacherInfo: { payments: { accountNumber: 1, cardNumber: 1, name: 1, bankName: 1 } },
        },
      },
    ]
    // lấy data teacher
    const teacher = (await UserModel.aggregate(query))[0]
    // lấy hoá đơn có tác giả in users id
    var invoices = await DetailInvoiceModel.aggregate([
      {
        $project: {
          invoice: 1,
          courseId: 1,
          courseSlug: 1,
          courseThumbnail: 1,
          courseName: 1,
          courseCurrentPrice: 1,
          courseAuthor: 1,
          couponCode: 1,
          amount: 1,
          discount: 1,
          status: 1,
          createdAt: 1,
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
        },
      },
      {
        $match: {
          courseAuthor: teacher._id,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      {
        $project: {
          invoice: 1,
          courseId: 1,
          courseSlug: 1,
          courseThumbnail: 1,
          courseName: 1,
          courseCurrentPrice: 1,
          courseAuthor: 1,
          couponCode: 1,
          amount: 1,
          discount: 1,
          status: 1,
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%d-%m-%Y %H:%M:%S',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
    ])
    invoices = invoices.map((i) => {
      i.amount = i.amount * 0.8
      return i
    })

    teacher.revenue = 0
    teacher.numOfDetailInvoice = invoices.length
    for (let i = 0; i < invoices.length; i++) {
      const element = invoices[i]
      teacher.revenue += element.amount
    }
    teacher.detailInvoices = invoices

    if (exports.toLowerCase().trim() == 'true') {
      const data = [
        [`BẢNG THỐNG KÊ CHI TIẾT HOA HỒNG CỦA GIÁO VIÊN THÁNG ${month}-${year}`],
        ['Email', 'Tên', 'STK', 'Tên', 'Ngân hàng', 'Số tiền (VNĐ)'],
        [
          teacher.account.email,
          teacher.fullName,
          teacher.teacherInfo?.payments.accountNumber || null,
          teacher.teacherInfo?.payments.name || null,
          teacher.teacherInfo?.payments.bankName || null,
          teacher.revenue,
        ],
        [],
        ['Bảng chi tiết các hoá đơn'],
        [
          'Mã Hoá đơn',
          'Mã khoá học',
          'Tên khoá học',
          'Giá khoá học',
          'Mã giảm giá',
          'Giá giảm',
          'Thanh toán',
          'Tạo lúc',
        ],
      ]
      invoices.forEach((invoice) => {
        let info = [
          invoice.invoice,
          invoice.courseId.toString(),
          invoice.courseName,
          invoice.courseCurrentPrice,
          invoice.couponCode,
          invoice.discount,
          invoice.amount,
          invoice.createdAt,
        ]
        data.push(info)
      })

      let range1 = { s: { c: 0, r: 0 }, e: { c: 13, r: 0 } } // A1:A13
      const sheetOptions = { '!merges': [range1] }
      var buffer = xlsx.build([{ name: 'data', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream(
        './src/public/statistics/thong-ke-chi-tiet-hoa-hong-theo-thang.xlsx'
      ).write(buffer)
      res.status(200).json({
        message: 'ok',
        teacher,
        file: '/statistics/thong-ke-chi-tiet-hoa-hong-theo-thang.xlsx',
      })
      return
    }
    res.status(200).json({ message: 'ok', teacher })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// thống kê top doanh thu/số lượng bán của teacher theo các tháng trong năm
const getTopMonthlyTeachers = async (req, res, next) => {
  try {
    const { top = 5, year = new Date().getFullYear() } = req.query

    let query = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $unwind: '$account',
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacherInfo',
        },
      },
      {
        $unwind: {
          path: '$teacherInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'account.role': 'teacher',
        },
      },
      {
        $project: {
          fullName: 1,
          phone: 1,
          account: { email: 1, role: 1 },
          teacherInfo: { payments: { accountNumber: 1, cardNumber: 1, name: 1, bankName: 1 } },
        },
      },
    ]
    const teachers = await UserModel.aggregate(query)

    const invoices = await DetailInvoiceModel.aggregate([
      {
        $project: {
          invoice: 1,
          courseAuthor: 1,
          createdAt: 1,
          amount: 1,
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $project: {
          invoice: 1,
          month: { $month: '$createdAt' },
          courseAuthor: 1,
          amount: 1,
        },
      },
    ])

    var result = [[], [], [], [], [], [], [], [], [], [], [], []]
    for (let i = 0; i < 12; i++) {
      let preResult = teachers.map((teacher) => {
        let count = 0
        let total = 0
        invoices.forEach((invoice) => {
          let month = parseInt(invoice.month)
          let author = JSON.stringify(invoice.courseAuthor)
          if (month == i + 1 && author == JSON.stringify(teacher._id)) {
            count++
            total += invoice.amount
          }
        })
        teacher.total = total
        teacher.count = count
        return teacher
      })
      preResult = preResult.filter((item) => item.total > 0)
      result[i] = _.orderBy(JSON.parse(JSON.stringify(preResult)), ['total'], ['desc']).slice(
        0,
        parseInt(top)
      )
    }
    res.status(200).json({ message: 'ok', result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

//  top giáo viên có số lượng bán/doanh thu cao nhất trong năm
const getTopYearTeachers = async (req, res, next) => {
  try {
    const { top = 5, year = new Date().getFullYear() } = req.query

    let query = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
      {
        $unwind: '$account',
      },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacherInfo',
        },
      },
      {
        $unwind: {
          path: '$teacherInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'account.role': 'teacher',
        },
      },
      {
        $project: {
          fullName: 1,
          phone: 1,
          account: { email: 1, role: 1 },
          teacherInfo: { payments: { accountNumber: 1, cardNumber: 1, name: 1, bankName: 1 } },
        },
      },
    ]
    const teachers = await UserModel.aggregate(query)

    const invoices = await DetailInvoiceModel.aggregate([
      {
        $project: {
          invoice: 1,
          courseAuthor: 1,
          createdAt: 1,
          amount: 1,
        },
      },
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $project: {
          invoice: 1,
          courseAuthor: 1,
          amount: 1,
        },
      },
    ])

    var result = teachers.map((teacher) => {
      let count = 0
      let total = 0
      invoices.forEach((invoice) => {
        let author = JSON.stringify(invoice.courseAuthor)
        if (author == JSON.stringify(teacher._id)) {
          count++
          total += invoice.amount
        }
      })
      teacher.total = total
      teacher.count = count
      return teacher
    })
    result = result.filter((item) => item.total > 0)

    result = _.orderBy(JSON.parse(JSON.stringify(result)), ['total'], ['desc']).slice(
      0,
      parseInt(top)
    )

    res.status(200).json({ message: 'ok', result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getDailyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
  getCountUsersByYear,
  getCountUsersByMonth,
  getCountCourses,
  getCountCoupons,
  getTopSaleCoursesOfYear,
  getTopSaleCoursesOfMonth,
  getTeachersRevenueByMonth,
  getDetailTeachersRevenue,
  getTopMonthlyTeachers,
  getTopYearTeachers,
}
