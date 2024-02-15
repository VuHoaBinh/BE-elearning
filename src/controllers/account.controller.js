const helper = require('../helper/index')
const mailConfig = require('../configs/mail.config')
const constants = require('../constants/index')
const bcrypt = require('bcryptjs')
const AccountModel = require('../models/users/account.model')
const VerifyModel = require('../models/users/verify.model')
const UserModel = require('../models/users/user.model')
const HistorySearchModel = require('../models/users/historySearch.model')

// fn: gửi mã xác thực để đăng ký tài khoản
const postSendVerifyCode = async (req, res, next) => {
  try {
    const { email } = req.body
    const account = await AccountModel.findOne({ email })
    if (account) return res.status(400).json({ message: 'Email đã được sử dụng !' })

    //cấu hình email sẽ gửi
    const verifyCode = helper.generateVerifyCode(constants.NUMBER_VERIFY_CODE)
    const mail = {
      to: email,
      subject: 'Mã xác thực tạo tài khoản',
      html: mailConfig.htmlSignupAccount(verifyCode),
    }

    //lưu mã vào database để xác thực sau này
    await VerifyModel.deleteMany({ email })
    await VerifyModel.create({
      code: verifyCode,
      email,
      dateCreated: Date.now(),
    })

    //gửi mail
    const { err } = await mailConfig.sendEmail(mail)
    if (err) {
      throw err
    }
    return res.status(200).json({ message: 'Gửi mã xác thực thành công!' })
  } catch (error) {
    return res.status(500).json({
      message: 'Gửi mã thất bại',
      error,
    })
  }
}

// fn: đăng ký tài khoản
const postSignup = async (req, res, next) => {
  try {
    const { email, password, verifyCode, fullName, birthday, gender, phone } = req.body

    const account = await AccountModel.findOne({ email })
    if (account) return res.status(403).json({ message: `Email đã được sử dụng!` })

    // kiểm tra mã xác thực
    const isVerify = await helper.isVerifyEmail(email, verifyCode.trim())
    if (!isVerify) return res.status(403).json({ message: 'Mã xác thực không hợp lệ!' })

    const newAccount = await AccountModel.create({
      email,
      password: password.trim(),
    })
    const newUser = await UserModel.create({
      account: newAccount._id,
      fullName,
      birthday,
      gender,
      phone,
    })
    await HistorySearchModel.create({ user: newUser._id })
    await VerifyModel.deleteOne({ email })

    return res.status(200).json({
      message: 'Tạo tài khoản thành công!',
    })
  } catch (error) {
    console.log('> Create account fail: ', error)

    return res.status(500).json({
      message: 'Tạo tài khoản thất bại!',
      error,
    })
  }
}

// fn: gửi mã xác thực để lấy lại mật khẩu
const postSendCodeResetPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const account = await AccountModel.findOne({ email })
    if (!account) return res.status(401).json({ message: 'Tài khoản không tồn tại' })

    //cấu hình email sẽ gửi
    const verifyCode = helper.generateVerifyCode(constants.NUMBER_VERIFY_CODE)
    const mail = {
      to: email,
      subject: 'Thay đổi mật khẩu',
      html: mailConfig.htmlResetPassword(verifyCode),
    }

    //lưu mã vào database để xác thực sau này
    await VerifyModel.deleteMany({ email })
    await VerifyModel.create({
      code: verifyCode,
      email,
      dateCreated: Date.now(),
    })

    //gửi mail
    const { err } = await mailConfig.sendEmail(mail)
    if (err) {
      throw err
    }
    return res.status(200).json({ message: 'Gửi mã xác thực thành công!' })
  } catch (error) {
    return res.status(500).json({
      message: 'Gửi mã thất bại',
      error,
    })
  }
}

// fn: lấy lại mật khẩu
const postResetPassword = async (req, res, next) => {
  try {
    const { email, password, verifyCode } = req.body

    const account = await AccountModel.findOne({ email })
    if (!account) return res.status(401).json({ message: 'Tài khoản không tồn tại!' })

    // kiểm tra mã xác thực
    const isVerify = await helper.isVerifyEmail(email, verifyCode)
    if (!isVerify) return res.status(401).json({ message: 'Mã xác nhận không hợp lệ.' })

    //check userName -> hash new password -> change password
    const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND))

    const response = await AccountModel.updateOne({ email }, { password: hashPassword })

    if (response.modifiedCount == 1) {
      //xoá mã xác nhận
      await VerifyModel.deleteOne({ email })
      return res.status(200).json({ message: 'Thay đổi mật khẩu thành công' })
    }
    return res.status(409).json({ message: 'Thay đổi mật khẩu thất bại' })
  } catch (error) {
    console.log('> Reset password fail: ', error)
    return res.status(500).json({ message: 'Thay đổi mật khẩu thất bại' })
  }
}

// fn: đổi mật khẩu
const postChangePassword = async (req, res, next) => {
  try {
    // check account => hash password => change password
    const account = req.account
    const { oldPassword, password } = req.body

    const isMatch = await bcrypt.compare(oldPassword, account.password)
    if (!isMatch) return res.status(403).json({ message: 'Mật khẩu hiện tại sai' })

    // kiểm tra mật khẩu cũ có trùng với mật khẩu mới
    const isSame = JSON.stringify(oldPassword) === JSON.stringify(password)
    if (isSame) return res.status(400).json({ message: 'Mật khẩu mới giống mật khẩu cũ' })

    //check userName -> hash new password -> change password
    const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND))

    const response = await AccountModel.updateOne({ _id: account._id }, { password: hashPassword })
    if (response.modifiedCount == 1) {
      return res.status(200).json({ message: 'Thay đổi mật khẩu thành công!' })
    }
    return res.status(400).json({ message: 'Thay đổi mật khẩu thất bại' })
  } catch (error) {
    console.log('> Change password fail: ', error)
    return res.status(500).json({ message: 'Thay đổi mật khẩu thất bại', error })
  }
}

module.exports = {
  postSendVerifyCode,
  postSignup,
  postResetPassword,
  postSendCodeResetPassword,
  postChangePassword,
}
