const UserModel = require('../models/users/user.model')
const AccountModel = require('../models/users/account.model')
const TeacherModel = require('../models/users/teacher.model')
const HistorySearchModel = require('../models/users/historySearch.model')
const HistoryViewModel = require('../models/users/historyView.model')
const InvoiceModel = require('../models/invoice.model')
const helper = require('../helper')
const uniqid = require('uniqid')
const mongoose = require('mongoose')
const DetailInvoiceModel = require('../models/detailInvoice.model')
const ObjectId = mongoose.Types.ObjectId
// fn: lấy thông tin user hiện tại
const getUser = async (req, res, next) => {
  try {
    const { _id } = req.user
    const user = await UserModel.findById(_id).populate('account', 'email role')
    res.status(200).json({ message: 'ok', user })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'error' })
  }
}

// fn: cập nhật thông tin user
const putUser = async (req, res, next) => {
  try {
    let payload = req.body
    const image = req.file
    const { _id } = req.user

    if (image) {
      payload.avatar = await helper.uploadImageToCloudinary(image, uniqid.time(), 'avatar')
    }
    const user = await UserModel.findOneAndUpdate({ _id }, payload, { new: true })
    res.status(200).json({ message: 'update oke', user })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'error' })
  }
}

// fn: kích hoạt instructor
const postActiveTeacherRole = async (req, res, next) => {
  try {
    const { user } = req
    // kiểm tra đã kích hoạt chưa
    var teacher = await TeacherModel.findOne({ user }).lean()
    let message = 'kích hoạt thành công'
    if (teacher) {
      message = 'Đã kích hoạt role teacher'
    } else {
      teacher = await TeacherModel.create({ user })
    }
    res.status(200).json({ message, teacher })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'error' })
  }
}

// fn: lấy lịch sử tìm kiếm
const getHistorySearchAndView = async (req, res, next) => {
  try {
    const { user } = req
    // lấy lich sử tìm
    const historySearch = await HistorySearchModel.findOne({ user })
      .select('historySearchs -_id')
      .lean()
    // lấy lich sử xem
    const historyView = await HistoryViewModel.findOne({ user })
      .select('historyViews -_id')
      .populate({ path: 'historyViews', model: 'course', select: '_id name slug thumbnail' })
      .lean()

    res.status(200).json({ message: 'ok', historySearch, historyView })
  } catch (error) {
    console.log(error)
    res.status(200).json({ message: 'error' })
  }
}

// fn: lấy lịch sử thanh toán
const getMyInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, status } = req.query
    const { user } = req
    let query = [
      {
        $match: {
          user: user._id,
          status: 'Paid',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'detailInvoices',
          localField: '_id',
          foreignField: 'invoice',
          as: 'detailInvoices',
        },
      },
      {
        $project: {
          transactionId: 1,
          totalPrice: 1,
          totalDiscount: 1,
          paymentPrice: 1,
          paymentMethod: 1,
          status: 1,
          // 'user': 1
          user: { _id: 1, fullName: 1, phone: 1, avatar: 1 },
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%dT%H:%M:%S',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]
    let aCountQuery = [
      {
        $match: {
          user: user._id,
          status: 'Paid',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'detailInvoices',
          localField: '_id',
          foreignField: 'invoice',
          as: 'detailInvoices',
        },
      },
      {
        $project: {
          transactionId: 1,
          totalPrice: 1,
          totalDiscount: 1,
          paymentPrice: 1,
          paymentMethod: 1,
          status: 1,
          // 'user': 1
          user: { _id: 1, fullName: 1, phone: 1, avatar: 1 },
          createdAt: {
            $dateToString: {
              date: '$createdAt',
              format: '%Y-%m-%dT%H:%M:%S',
              timezone: 'Asia/Ho_Chi_Minh',
            },
          },
        },
      },
    ]

    if (status) {
      query.push({ $match: { status: status } })
    }

    const invoices = await InvoiceModel.aggregate(query)
    aCountQuery.push({ $count: 'total' })
    const totalCount = await InvoiceModel.aggregate(aCountQuery)
    const total = totalCount[0]?.total || 0

    res.status(200).json({ message: 'ok', total, invoices })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: lấy lịch sử thanh toán
const getDetailMyInvoices = async (req, res, next) => {
  try {
    const { id } = req.params
    const { user } = req
    const invoice = await InvoiceModel.findOne({ _id: id, user: user._id })
      .populate('user', '_id fullName')
      .lean()
    if (!invoice) {
      return res.status(404).json({ message: 'Not found' })
    }
    const detailInvoices = await DetailInvoiceModel.find({ invoice: id })
      .populate('courseAuthor', '_id fullName')
      .lean()
    invoice.detailInvoices = detailInvoices
    invoice.qrcode = await helper.generateQR(`${process.env.FRONTEND_URL}/invoice/${id}`)
    res.status(200).json({ message: 'ok', invoice: invoice })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getUser,
  putUser,
  postActiveTeacherRole,
  getHistorySearchAndView,
  getMyInvoices,
  getDetailMyInvoices,
}
