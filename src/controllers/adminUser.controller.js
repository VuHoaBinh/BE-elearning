const AccountModel = require('../models/users/account.model')
const UserModel = require('../models/users/user.model')
const HistorySearchModel = require('../models/users/historySearch.model')
var bcrypt = require('bcryptjs')
var xlsx = require('node-xlsx').default
var fs = require('fs')
const MyCourseModel = require('../models/users/myCourse.model')
const mongoose = require('mongoose')
const TeacherModel = require('../models/users/teacher.model')
const CourseModel = require('../models/courses/course.model')
const ObjectId = mongoose.Types.ObjectId

function ValidateEmail(mail) {
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
    return true
  }
  return false
}

// fn: lấy thông tin và tài khoản người dùng
// GET /api/admin/users?page=1&limit=10&role=user
const getAccountAndUsers = async (req, res, next) => {
  try {
    const { page, limit, sort, email, role, active, exports = 'false' } = req.query
    let aCountQuery = [
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
    ]
    let aQuery = [
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
    ]
    if (email) {
      aQuery.push({ $match: { 'account.email': new RegExp(email, 'img') } })
      aCountQuery.push({ $match: { 'account.email': new RegExp(email, 'img') } })
    }
    if (role) {
      aQuery.push({ $match: { 'account.role': role } })
      aCountQuery.push({ $match: { 'account.role': role } })
    }
    if (active) {
      aQuery.push({ $match: { 'account.isActive': active == 'true' } })
      aCountQuery.push({ $match: { 'account.isActive': active == 'true' } })
    }
    if (sort) {
      let sortBy = {}
      let [f, v] = sort.split('-')
      sortBy[f] = v == 'asc' || v == 1 ? 1 : -1
      aQuery.push({ $sort: sortBy })
    }

    // phân trang và bỏ 1 số trường không cần dùng
    aQuery.push({
      $project: {
        'account.password': 0,
        'account.refreshToken': 0,
        'account.accessToken': 0,
        'account.__v': 0,
        __v: 0,
      },
    })

    if (page && limit) {
      aQuery.push(
        {
          $skip: (parseInt(page) - 1) * parseInt(limit),
        },
        {
          $limit: parseInt(limit),
        }
      )
    }

    aCountQuery.push({
      $count: 'total',
    })
    const totalUsers = await UserModel.aggregate(aCountQuery)
    const total = totalUsers[0]?.total || 0
    const users = await UserModel.aggregate(aQuery)

    if (exports.toLowerCase().trim() == 'true') {
      if (page && limit) {
        aQuery.pop()
        aQuery.pop()
      }
      const dataUsers = await UserModel.aggregate(aQuery)
      const data = [
        [`DANH SÁCH THÔNG TIN NGƯỜI DÙNG`],
        ['Email', 'Tên', 'Số điện thoại', 'Ngày sinh', 'Giới tính', 'Role'],
      ]
      dataUsers.forEach((item) => {
        data.push([
          item.account.email,
          item.fullName,
          item.phone,
          item.birthday,
          item.gender,
          item.account.role,
        ])
      })

      let range1 = { s: { c: 0, r: 0 }, e: { c: 7, r: 0 } } // A1:A13
      const sheetOptions = { '!merges': [range1] }
      var buffer = xlsx.build([{ name: 'data', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/danh-sach-tai-khoan-nguoi-dung.xlsx').write(
        buffer
      )
      return res.status(200).json({
        message: 'ok',
        total,
        users,
        file: '/statistics/danh-sach-tai-khoan-nguoi-dung.xlsx',
      })
    }

    return res.status(200).json({ message: 'ok', total, users })
  } catch (error) {
    console.error('> Get account and user fail :: ', error)
    return res.status(500).json({ message: 'error' })
  }
}

// fn: lấy thông tin của học sinh
const getStudents = async (req, res, next) => {
  try {
    const { page, limit, sort, exports = 'false' } = req.query
    let aCountQuery = [
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
        $match: {
          $or: [{ 'account.role': 'student' }, { 'account.role': 'customer' }],
          'account.isActive': true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'account._id',
          foreignField: 'account',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'myCourses',
          localField: '_id',
          foreignField: 'user',
          as: 'myCourse',
        },
      },
      {
        $match: {
          myCourse: { $exists: true, $ne: [] }, // Filter out documents with empty myCourse array
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'myCourse.course',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $group: {
          _id: '$account._id',
          account: { $first: '$account' },
          user: { $first: '$user' },
          myCourse: { $first: { $arrayElemAt: ['$myCourse', 0] } },
          course: { $first: { $arrayElemAt: ['$course', 0] } },
        },
      },
    ]
    let aQuery = [
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
        $match: {
          $or: [{ 'account.role': 'student' }, { 'account.role': 'customer' }],
          'account.isActive': true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'account._id',
          foreignField: 'account',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'myCourses',
          localField: '_id',
          foreignField: 'user',
          as: 'myCourse',
        },
      },
      {
        $match: {
          myCourse: { $exists: true, $ne: [] }, // Filter out documents with empty myCourse array
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'myCourse.course',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $group: {
          _id: '$account._id',
          account: { $first: '$account' },
          user: { $first: '$user' },
          myCourse: { $first: { $arrayElemAt: ['$myCourse', 0] } },
          course: { $first: { $arrayElemAt: ['$course', 0] } },
        },
      },
    ]
    if (sort) {
      let sortBy = {}
      let [f, v] = sort.split('-')
      sortBy[f] = v == 'asc' || v == 1 ? 1 : -1
      aQuery.push({ $sort: sortBy })
    }

    // phân trang và bỏ 1 số trường không cần dùng
    aQuery.push({
      $project: {
        'account.password': 0,
        'account.refreshToken': 0,
        'account.accessToken': 0,
        'account.__v': 0,
        __v: 0,
      },
    })

    if (page && limit) {
      aQuery.push(
        {
          $skip: (parseInt(page) - 1) * parseInt(limit),
        },
        {
          $limit: parseInt(limit),
        }
      )
    }

    aCountQuery.push({
      $count: 'total',
    })
    const totalUsers = await UserModel.aggregate(aCountQuery)
    const total = totalUsers[0]?.total || 0
    const users = await UserModel.aggregate(aQuery)

    if (exports.toLowerCase().trim() == 'true') {
      if (page && limit) {
        aQuery.pop()
        aQuery.pop()
      }
      const dataStudents = await UserModel.aggregate(aQuery)
      const data = [
        [`DANH SÁCH THÔNG TIN HỌC SINH`],
        ['Email', 'Tên', 'Số điện thoại', 'Ngày sinh', 'Giới tính', 'Role'],
      ]
      dataStudents.forEach((item) => {
        data.push([
          item.account.email,
          item.fullName,
          item.phone,
          item.birthday,
          item.gender,
          item.account.role,
        ])
      })

      let range1 = { s: { c: 0, r: 0 }, e: { c: 7, r: 0 } } // A1:A13
      const sheetOptions = { '!merges': [range1] }
      var buffer = xlsx.build([{ name: 'data', data: data }], { sheetOptions }) // Returns a buffer
      fs.createWriteStream('./src/public/statistics/danh-sach-hoc-sinh.xlsx').write(buffer)
      return res.status(200).json({
        message: 'ok',
        total,
        users,
        file: '/statistics/danh-sach-hoc-sinh.xlsx',
      })
    }

    return res.status(200).json({ message: 'ok', total, users })
  } catch (error) {
    console.error('> Get student fail :: ', error)
    return res.status(500).json({ message: 'error' })
  }
}

const getTeachers = async (req, res, next) => {
  try {
    const { page, limit, sort, email, active } = req.query
    let aCountQuery = [
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
      { $match: { 'account.role': 'teacher' } },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ]
    let aQuery = [
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
      { $match: { 'account.role': 'teacher' } },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ]
    if (email) {
      aQuery.push({ $match: { 'account.email': new RegExp(email, 'img') } })
      aCountQuery.push({ $match: { 'account.email': new RegExp(email, 'img') } })
    }
    if (active) {
      aQuery.push({ $match: { 'account.isActive': active == 'true' } })
      aCountQuery.push({ $match: { 'account.isActive': active == 'true' } })
    }
    if (sort) {
      let sortBy = {}
      let [f, v] = sort.split('-')
      sortBy[f] = v == 'asc' || v == 1 ? 1 : -1
      aQuery.push({ $sort: sortBy })
    }

    if (page && limit) {
      aQuery.push(
        {
          $skip: (parseInt(page) - 1) * parseInt(limit),
        },
        {
          $limit: parseInt(limit),
        }
      )
    }
    aQuery.push({
      $project: {
        'account.password': 0,
        'account.refreshToken': 0,
        'account.accessToken': 0,
        'account.__v': 0,
        __v: 0,
      },
    })
    aCountQuery.push({
      $count: 'total',
    })
    const totalUsers = await UserModel.aggregate(aCountQuery)
    const total = totalUsers[0]?.total || 0
    const teachers = await UserModel.aggregate(aQuery)
    return res.status(200).json({ message: 'ok', total, teachers })
  } catch (error) {
    console.error('> Get list teacher fail :: ', error)
    return res.status(500).json({ message: error.message })
  }
}

const getDetailTeacher = async (req, res, next) => {
  try {
    const { id } = req.params
    let aQuery = [
      { $match: { _id: ObjectId(id) } },
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
      { $match: { 'account.role': 'teacher' } },
      {
        $lookup: {
          from: 'teachers',
          localField: '_id',
          foreignField: 'user',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
      {
        $project: {
          'account.password': 0,
          'account.refreshToken': 0,
          'account.accessToken': 0,
          'account.__v': 0,
          __v: 0,
        },
      },
    ]
    const teacher = (await UserModel.aggregate(aQuery))[0]
    if (!teacher) {
      return res.status(404).json({ message: 'Not found' })
    }
    return res.status(200).json({ message: 'ok', teacher })
  } catch (error) {
    console.log('> Get detail teacher fail :: ', error)
    return res.status(500).json({ message: error.message })
  }
}

// fn: lấy thông tin chi tiết tài khoản người dùng
const getDetailAccountAndUser = async (req, res, next) => {
  try {
    const { id } = req.params
    let aQuery = [
      { $match: { _id: ObjectId(id) } },
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
          from: 'users',
          localField: 'account._id',
          foreignField: 'account',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'myCourses',
          localField: '_id',
          foreignField: 'user',
          as: 'myCourse',
        },
      },
      {
        $unwind: '$myCourse',
      },
      {
        $project: {
          'account.password': 0,
          'account.refreshToken': 0,
          'account.accessToken': 0,
          'account.__v': 0,
          __v: 0,
        },
      },
    ]
    const user = (await UserModel.aggregate(aQuery))[0]
    if (!user) {
      return res.status(404).json({ message: 'Not found' })
    }
    return res.status(200).json({ message: 'ok', user })
  } catch (error) {
    console.log('> Get detail user fail :: ', error)
    return res.status(500).json({ message: error.message })
  }
}

// fn: tạo tài khoản và người dùng
// POST /api/admin/users
const postAccountAndUser = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role = 'student',
      fullName,
      birthday,
      gender,
      phone,
      courseId,
      progressPaid,
    } = req.body

    if (ValidateEmail(email)) {
      let course;
      if (role === 'student') {
        course = await CourseModel.findById(courseId).lean()
        if (!course) {
          return res.status(404).json({ message: 'Not found' })
        }
      }

      const newAcc = await AccountModel.create({
        email: email.toLowerCase().trim(),
        password: password.trim(),
        role,
      })

      if (newAcc) {
        const newUser = await UserModel.create({
          fullName,
          account: newAcc._id,
          birthday,
          gender,
          phone,
        })
        if (newUser) await HistorySearchModel.create({ user: newUser._id })
        if (newUser && role == 'teacher')  await TeacherModel.create({ user: newUser._id, isVerified: true })
        else if (newUser && role === 'student')  await MyCourseModel.create({ user: newUser, course, progressPaid })
      }
    
      return res.status(201).json({ message: 'ok' })
    }
    return res.status(400).json({ message: 'email không hợp lệ' })
  } catch (error) {
    console.log('> Create account user fail:', error)
    return res.status(500).json({ message: error })
  }
}

// fn: tạo  nhiều tài khoản và người dùng
// POST /api/admin/users/multiple
const postMultiAccountAndUser = async (req, res, next) => {
  try {
    const file = req.file
    // đọc data
    let data = xlsx.parse(file.path)[0].data
    // xoá dòng trống
    data = data.filter((row) => row.length != 0)
    let success = 0
    let logs = Date.now() + '.txt'
    // lặp tạo tài khoản
    for (let i = 1; i < data.length; i++) {
      var [email, password, role, fullName, gender] = data[i]
      if (email != null) {
        if (ValidateEmail(email)) {
          if (password != null && password.toString().trim() > 7) {
            try {
              const newAcc = await AccountModel.create({
                email,
                password: password.toString().trim(),
                role,
              })
              if (newAcc) {
                const newUser = await UserModel.create({
                  fullName,
                  account: newAcc._id,
                  gender,
                })
                if (newUser && newAcc.role == 'teacher') {
                  await TeacherModel.create({ user: newUser._id })
                }
                if (newUser) {
                  await HistorySearchModel.create({ user: newUser._id })
                  success++
                }
              }
            } catch (error) {
              console.log(error)
              fs.appendFileSync(
                `./src/public/logs/${logs}`,
                `dòng ${i + 1}, lỗi email ${email} đã được sử dụng \n`
              )
            }
          } else {
            fs.appendFileSync(
              `./src/public/logs/${logs}`,
              `dòng ${i + 1}, lỗi password: '${password}' không hợp lệ hoặc bỏ trống \n`
            )
          }
        } else {
          fs.appendFileSync(
            `./src/public/logs/${logs}`,
            `dòng ${i + 1}, lỗi email ${email} không hợp lệ \n`
          )
        }
      } else {
        fs.appendFileSync(
          `./src/public/logs/${logs}`,
          `dòng ${i + 1}, lỗi email không được để trống \n`
        )
      }
    }
    if (sucess == data.length - 1) {
      res.status(201).json({ message: `đã tạo ${sucess}/${data.length - 1} tài khoản` })
    } else {
      res.status(201).json({
        message: `đã tạo ${sucess}/${data.length - 1} tài khoản`,
        urlLogs: `/logs/${logs}`,
      })
    }
    // xoá file
    fs.unlinkSync(file.path)
    return
  } catch (error) {
    console.log('> Create many account user fail:', error)
    return res.status(500).json({ message: error })
  }
}

// fn: cập nhật tài khoản và người dùng
// PUT /api/admin/users/:id
const putAccountAndUser = async (req, res, next) => {
  try {
    const { id } = req.params
    var { user, account, courseId, progressPaid } = req.body
    // check input tránh hacker
    if (user && user.account) {
      delete user.account
    }
    if (user && user.avatar) {
      delete user.avatar
    }
    if (account && account.email) {
      delete account.email
    }
    if (account !== null && typeof account === 'object') {
      let userInfo = await UserModel.findById(id).lean()
      if (account.password) {
        if (account.password.trim().length > 7) {
          const hashPassword = await bcrypt.hash(
            account.password.trim(),
            parseInt(process.env.SALT_ROUND)
          )
          account.password = hashPassword
        } else {
          return res.status(400).json({ message: 'password phải dài hơn 7 ký tự' })
        }
      }
      await AccountModel.updateOne({ _id: userInfo.account }, account)
    }
    if (user !== null && typeof user === 'object') {
      await UserModel.updateOne({ _id: id }, user)
    }
    if (courseId) {
      let course = await CourseModel.findById(courseId)
      await MyCourseModel.updateOne({ user: id }, { course, progressPaid })
    }
    return res.status(200).json({ message: 'update ok' })
  } catch (error) {
    console.log('> Update account user fail', error)
    return res.status(500).json({ message: 'error' })
  }
}

// fn: xoá tài khoản và người dùng (chưa xoá my course, notification...)
// DELETE /api/admin/users/:id
const deleteAccountAndUser = async (req, res, next) => {
  try {
    const { id } = req.params

    let user = await UserModel.findById(id).lean()
    await UserModel.deleteOne({ _id: id })
    await AccountModel.deleteOne({ _id: user.account })
    return res.status(200).json({ message: 'ok!' })
  } catch (error) {
    console.log('> Delete account user fail', error)
    return res.status(500).json({ message: 'error' })
  }
}

// DELETE /api/admin/users
const deleteMultiAccountAndUser = async (req, res, next) => {
  try {
    const { ids } = req.body
    let logs = ''
    let success = 0
    for (let i = 0; i < ids.length; i++) {
      let id = ids[i]
      let user = {}
      try {
        user = await UserModel.findById(id)
      } catch (error) {
        logs += `Lỗi: index:${i}. id '${id}' không hợp lệ \n`
      }
      if (!user) {
        logs += `Lỗi: index:${i}. id '${id}' không tồn tại \n`
        continue
      }
      await UserModel.deleteOne({ _id: id })
      await AccountModel.deleteOne({ _id: user.account })
      if (modifiedCount != 1) {
        logs += `Lỗi: index:${i}. id '${id}' giá trị cập nhật không khác giá trị ban đầu`
        continue
      }
      success++
    }
    if (logs == '') {
      return res.status(200).json({ message: `update ${success}/${ids.length} oke` })
    }
    return res.status(200).json({ message: `update ${success}/${ids.length} oke`, error: logs })
  } catch (error) {
    console.log('> Delete many account fail:', error)
    return res.status(500).json({ message: error })
  }
}

// lấy danh sách id học sinh của 1 teacher
const getStudentsOfTeacher = async (req, res, next) => {
  try {
    const { id } = req.params
    let data = await MyCourseModel.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $match: { 'course.author': ObjectId(id) },
      },
      {
        $project: {
          _id: 0,
          user: 1,
        },
      },
    ])
    data = data.map((item) => item.user)
    return res.status(200).json({ message: 'ok', data })
  } catch (error) {
    console.log('> Get list student of teacher fail:', error)
    res.status(500).json({ message: error })
  }
}

module.exports = {
  getAccountAndUsers,
  getDetailAccountAndUser,
  postAccountAndUser,
  postMultiAccountAndUser,
  putAccountAndUser,
  deleteAccountAndUser,
  deleteMultiAccountAndUser,
  getStudentsOfTeacher,
  getTeachers,
  getDetailTeacher,
  getStudents,
}
