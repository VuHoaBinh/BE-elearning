const express = require('express')
const adminUserApis = express.Router()
const adminUserController = require('../controllers/adminUser.controller')
const passport = require('../middlewares/passport.middleware')
const { dontStorageUpload } = require('../configs/storage.config')

// api: lấy danh sách tài khoản giáo viên
adminUserApis.get(
  '/teachers',
  passport.jwtAuthentication,
  passport.isAdmin,
  adminUserController.getTeachers
)

// api: lấy danh sách học sinh
adminUserApis.get(
  '/students',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.getStudents
)

// api: lấy chi tiết 1 tài khoản giáo viên bằng id
adminUserApis.get(
  '/teachers/:id',
  passport.jwtAuthentication,
  passport.isAdmin,
  adminUserController.getDetailTeacher
)

// api: lấy danh sách tài khoản user
adminUserApis.get(
  '/',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.getAccountAndUsers
)

// api: lấy chi tiết 1 tài khoản user bằng id
adminUserApis.get(
  '/:id',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.getDetailAccountAndUser
)

// api: tạo một tài khoản và người dùng
adminUserApis.post(
  '/',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.postAccountAndUser
)

// api: tạo nhiều tài khoản người dùng
adminUserApis.post(
  '/multiple',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  dontStorageUpload.single('file'),
  adminUserController.postMultiAccountAndUser
)

// api: cập nhật tài khoản người dùng
adminUserApis.put(
  '/:id',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.putAccountAndUser
)

// api: xoá nhiều tài khoản người dùng
adminUserApis.delete(
  '/multiple',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.deleteMultiAccountAndUser
)

// api: xoá tài khoản người dùng
adminUserApis.delete(
  '/:id',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.deleteAccountAndUser
)

// api: lấy danh sách user đã mua khoá học của teacher
adminUserApis.get(
  '/students-of-teacher/:id',
  passport.jwtAuthentication,
  passport.isAdminOrTeacher,
  adminUserController.getStudentsOfTeacher
)

module.exports = adminUserApis
