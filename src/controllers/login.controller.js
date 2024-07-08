const AccountModel = require('../models/users/account.model')
const UserModel = require('../models/users/user.model')
const bcrypt = require('bcryptjs')
const jwtConfig = require('../configs/jwt.config')
const jwt = require('jsonwebtoken')
const constants = require('../constants')

// fn: login local
const postLogin = async (req, res, next) => {
  try {
    const { email, password, keepLogin = false } = req.body

    // check account is existing?
    const account = await AccountModel.findOne({ email }).lean()
    if (!account) return res.status(401).json({ message: 'Email không tồn tại!' })
    if (account.isActive == false) return res.status(401).json({ message: 'Tài khoản đã bị khoá.' })

    // check password
    const isMatch = await bcrypt.compare(password ? password : '', account.password)
    if (!isMatch) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' })

    // get user
    const user = await UserModel.findOne({ account: account._id }).lean()

    // login successfully
    // create refreshToken
    const refreshToken = await jwtConfig.encodedToken(
      process.env.JWT_SECRET_REFRESH_KEY,
      {
        account: account._id,
        keepLogin,
      },
      constants.JWT_REFRESH_EXPIRES_TIME
    )
    // create access token
    const accessToken = await jwtConfig.encodedToken(process.env.JWT_SECRET_KEY, {
      account: account._id,
    })
    // save refresh token
    await AccountModel.updateOne({ _id: account._id }, { refreshToken, accessToken })
    // send access token to client => use header beear authorization
    // keep access token as session if keepLogin is false
    const expiresIn = keepLogin ? new Date(Date.now() + constants.COOKIE_EXPIRES_TIME) : 0
    // res.cookie('access_token', accessToken, {
    //     httpOnly: true,
    //     expires: expiresIn,
    // });
    return res.status(200).json({
      message: 'Login success!',
      refreshToken,
      token: { expiresIn, accessToken },
      role: account.role,
      user,
    })
  } catch (error) {
    console.log('> error :', error)
    return res.status(500).json({ message: 'Error', error })
  }
}

// fn: login with google
const postLoginWithGoogle = async (req, res, next) => {
  try {
    const account = req.authInfo
    const user = req.user
    const { keepLogin = true } = req.body
    // login successfully
    // create refreshToken
    const refreshToken = await jwtConfig.encodedToken(
      process.env.JWT_SECRET_REFRESH_KEY,
      {
        account: account._id,
        keepLogin,
      },
      constants.JWT_REFRESH_EXPIRES_TIME
    )
    // create access token
    const accessToken = await jwtConfig.encodedToken(process.env.JWT_SECRET_KEY, {
      account: account._id,
    })
    //save refresh token
    await AccountModel.updateOne({ _id: account._id }, { refreshToken, accessToken })
    // send access token to client => use header beear authorization
    // keep access token as session if keepLogin is false
    const expiresIn = keepLogin ? new Date(Date.now() + constants.COOKIE_EXPIRES_TIME) : 0
    // res.cookie('access_token', accessToken, {
    //     httpOnly: true,
    //     expires: expiresIn,
    // });
    return res.status(200).json({
      message: 'Login success!',
      refreshToken,
      token: { expiresIn, accessToken },
      role: account.role,
      user,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'error' })
  }
}

// fn: signup
const postSignup = async (req, res, next) => {
  try {
    const { email, password, fullName, birthday, gender } = req.body
    // check email account is exist?
    const account = await AccountModel.findOne({ email })
    if (account) return res.status(401).json({ message: 'Email already in use!' })

    // create account
    const newAcc = await AccountModel.create({
      email,
      password,
    })
    if (newAcc) {
      await UserModel.create({
        accountId: newAcc._id,
        fullName,
        birthday,
        gender,
      })
      return res.status(200).json({ message: 'Create success' })
    }
  } catch (error) {
    console.log('> error :', error)
    return res.status(500).json({ message: 'Error', error })
  }
}

// fn: Đăng xuất
const postLogout = async (req, res, next) => {
  try {
    const account = req.account
    // Xoá refreshToken
    await AccountModel.updateOne({ _id: account._id }, { refreshToken: null, accessToken: null })
    // res.clearCookie('access_token');
    res.status(200).json({
      message: 'Đăng xuất thành công!',
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Đăng xuất thất bại!',
      error,
    })
  }
}

// fn: Refresh jwt token
const postRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refresh_token
    const account = await AccountModel.findOne({
      refreshToken,
    })
    if (!account) return res.status(401).json({ message: 'Refresh token không hợp lệ!' })

    // Xác nhận token
    const decoded = await jwt.verify(refreshToken, process.env.JWT_SECRET_REFRESH_KEY)

    const { userId, keepLogin } = decoded.sub
    // Tạo 1 access_token mới -> set cookie
    const newAccessToken = await jwtConfig.encodedToken(process.env.JWT_SECRET_KEY, { userId })

    // cookies expires if keepLogin then 0
    const expiresIn = keepLogin ? new Date(Date.now() + constants.COOKIE_EXPIRES_TIME) : 0
    return res.status(200).json({
      message: 'refresh token thành công!',
      token: newAccessToken,
      refreshToken,
      role: account.role,
      expiresIn,
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Không được phép!',
      error,
    })
  }
}

module.exports = {
  postLogin,
  postLoginWithGoogle,
  postSignup,
  postLogout,
  postRefreshToken,
}
