const { checkoutVNPay, callbackVNPay } = require('../payment/vnpay.controller');
const InvoiceModel = require('../../models/invoice.model');
const DetailInvoiceModel = require('../../models/detailInvoice.model');
const CouponModel = require('../../models/coupon.model');
var uniqid = require('uniqid');
const CourseModel = require('../../models/courses/course.model');
const MyCourseModel = require('../../models/users/myCourse.model');
const CartModel = require('../../models/users/cart.model');
const helper = require('../../helper/index');
const CodeModel = require('../../models/code.model');
const UserModel = require('../../models/users/user.model');
const mailConfig = require('../../configs/mail.config');
const mongoose = require('mongoose');
const ConversationModel = require('../../models/chats/conversation.model');
const MessageModel = require('../../models/chats/message.model');
const ObjectId = mongoose.Types.ObjectId;

const handlerCreateInvoice = async (data, user, orderId, status = 'Unpaid') => {
  try {
    // tạo hoá đơn tổng
    const invoice = await InvoiceModel.create({
      _id: orderId,
      transactionId: 'undefined',
      user: user._id,
      totalPrice: data.totalPrice,
      totalDiscount: data.totalDiscount,
      paymentPrice: data.estimatedPrice,
      status: status,
    });
    // tạo chi tiết hoá đơn
    for (let i = 0; i < data.carts.length; i++) {
      const { course, coupon } = data.carts[i];
      await DetailInvoiceModel.create({
        invoice: invoice._id,
        courseId: course._id,
        courseThumbnail: course.thumbnail,
        courseSlug: course.slug,
        courseName: course.name,
        courseCurrentPrice: course.currentPrice,
        courseAuthor: course.author,
        couponCode: coupon || '',
        amount: course.currentPrice - course.discount,
        discount: course.discount,
      });
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const postPaymentCheckout = async (req, res, next) => {
  try {
    const { user } = req;
    const carts = await CartModel.find({ user, wishlist: false })
      .populate({
        path: 'course',
        populate: { path: 'author', select: '_id fullName' },
        select: '_id slug name thumbnail author currentPrice category level',
      })
      .select('-__v -user')
      .lean();

    if (carts.length == 0) {
      return res.status(400).json({ message: 'giỏ hàng trống' });
    }
    const params = Object.assign({}, req.body);

    const clientIp =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // xử lý thông tin đơn hàng => tạo hoá đơn thanh toán
    let orderId = uniqid();
    // lấy giá tiền, giá tiền đã giảm, giá tiền ước tính cần thanh toán
    var result = await helper.hanlderCheckoutCarts(carts);
    if (result.error) {
      return res.status(500).json({ message: 'lỗi xử lý giỏ hàng' });
    }
    // nếu giá tiền phải trả là 0 => tạo khoá đơn, add khoá học
    if (result.estimatedPrice == 0) {
      let isCreated = await handlerCreateInvoice(result, user, orderId, 'Paid');
      if (!isCreated) return res.status(500).json({ message: 'server error' });

      // thông tin hoá đơn
      const invoice = await InvoiceModel.findById(orderId).lean();
      res
        .status(200)
        .json({ isSuccess: true, message: 'Thanh toán thành công', invoice });
      // thêm khoá học đã mua cho người dùng
      let detailInvoices = await DetailInvoiceModel.find({ invoice: orderId })
        .select('courseId couponCode')
        .lean();
      for (let i = 0; i < detailInvoices.length; i++) {
        const { courseId, couponCode } = detailInvoices[i];
        // cập nhật mã giảm giá đã dùng
        await CodeModel.findOneAndUpdate(
          { code: couponCode },
          { isActive: false }
        );
        // thêm khoá học vào danh sách đã mua
        await MyCourseModel.create({ user, course: courseId });
        const course = (
          await CourseModel.aggregate([
            { $match: { _id: ObjectId(courseId) } },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'author',
              },
            },
            { $unwind: '$author' },
          ])
        )[0];
        // connect chat
        var conversation = await ConversationModel.findOne({
          members: { $all: [user, course.author._id] },
        });
        if (!conversation) {
          conversation = await ConversationModel.create({
            members: [user, course.author._id],
          });
        }
        await MessageModel.create({
          conversation: conversation._id,
          sender: course.author._id,
          text: 'Cảm ơn bạn đã mua khoá học. Nếu có câu hỏi gì hãy nhắn tin cho tôi.',
        });
      }
      let ids = detailInvoices.map((item) => item.courseId);
      // cập nhật số lượng bán của khoá học
      await CourseModel.updateMany(
        { _id: { $in: ids } },
        { $inc: { sellNumber: 1 } }
      );
      // xoá giỏ hàng
      await CartModel.deleteMany({ user, wishlist: false });
      await CartModel.updateMany({ user }, { wishlist: false });
      return;
    }

    // tạo hoá đơn chưa thanh toán
    let isCreated = await handlerCreateInvoice(result, user, orderId);
    if (!isCreated) return res.status(500).json({ message: 'server error' });
    const amount = parseInt(result.estimatedPrice, 10);
    const now = new Date();

    // NOTE: only set the common required fields and optional fields from all gateways here, redundant fields will invalidate the payload schema checker
    // * Thông tin cần kiểm tra trước khi thanh toán
    const checkoutData = {
      amount,
      clientIp: clientIp.length > 15 ? '127.0.0.1' : clientIp,
      locale: 'vn',
      currency: 'VND',
      // edit at here
      orderId: orderId,
      transactionId: `node-${now.toISOString()}`, // same as orderId (we don't have retry mechanism)
      orderInfo: 'Thanh toan khoa hoc truc tuyen - ' + orderId,
      orderType: '190000', // giải trí và giáo dục
    };

    // pass checkoutData to gateway middleware via res.locals
    res.locals.checkoutData = checkoutData;

    // Note: these handler are asynchronous
    let asyncCheckout = null;
    switch (params.paymentMethod) {
      case 'vnPay':
        asyncCheckout = checkoutVNPay(req, res, next);
        break;
      default:
        break;
    }

    if (asyncCheckout) {
      asyncCheckout
        .then((checkoutUrl) => {
          res
            .status(200)
            .json({ message: 'chuyển tiếp', location: checkoutUrl.href });
          res.end();
        })
        .catch((err) => {
          res.send(err.message);
        });
    } else {
      res.send('Payment method not found');
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const getPaymentCallback = async (req, res, next) => {
  try {
    const { gateway } = req.params;
    let data = null;
    switch (gateway) {
      case 'vnpay':
        data = await callbackVNPay(req, res, next);
        break;
      default:
        break;
    }
    if (data) {
      let invoice = await InvoiceModel.findOne({
        _id: data.transactionId,
        transactionId: data.gatewayTransactionNo,
        status: { $ne: 'Unpaid' },
      })
        .populate('user')
        .lean();
      if (invoice) {
        res.redirect(`${process.env.FRONTEND_URL}/invoice/${invoice._id}`);
        return;
      }
      if (data.isSuccess) {
        // update hoá đơn
        invoice = await InvoiceModel.findOneAndUpdate(
          { _id: data.transactionId },
          { transactionId: data.gatewayTransactionNo, status: 'Paid' },
          { new: true }
        );
        res.redirect(`${process.env.FRONTEND_URL}/invoice/${invoice._id}`);
        // thêm khoá học đã mua cho người dùng
        let user = invoice.user;
        let detailInvoices = await DetailInvoiceModel.find({
          invoice: invoice._id,
        }).lean();
        for (let i = 0; i < detailInvoices.length; i++) {
          const { courseId, couponCode } = detailInvoices[i];
          // cập nhật mã giảm giá đã dùng
          await CodeModel.findOneAndUpdate(
            { code: couponCode },
            { isActive: false }
          );
          // thêm khoá học vào danh sách đã mua
          await MyCourseModel.create({ user, course: courseId });
          const course = (
            await CourseModel.aggregate([
              { $match: { _id: ObjectId(courseId) } },
              {
                $lookup: {
                  from: 'users',
                  localField: 'author',
                  foreignField: '_id',
                  as: 'author',
                },
              },
              { $unwind: '$author' },
            ])
          )[0];
          // connect chat
          var conversation = await ConversationModel.findOne({
            members: { $all: [user, course.author._id] },
          });
          if (!conversation) {
            conversation = await ConversationModel.create({
              members: [user, course.author._id],
            });
          }
          await MessageModel.create({
            conversation: conversation._id,
            sender: course.author._id,
            text: `Cảm ơn bạn đã mua khoá học ${course.name}. Nếu có câu hỏi gì hãy nhắn tin cho tôi.`,
          });
        }
        let ids = detailInvoices.map((item) => {
          return item.courseId;
        });
        // cập nhật số lượng bán của khoá học
        await CourseModel.updateMany(
          { _id: { $in: ids } },
          { $inc: { sellNumber: 1 } }
        );
        // xoá giỏ hàng
        await CartModel.deleteMany({ user, wishlist: false });
        // cập nhật wishlist thành false
        await CartModel.updateMany({ user }, { wishlist: false });
        invoice = (
          await InvoiceModel.aggregate([
            { $match: { _id: data.transactionId } },
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
          ])
        )[0];
        invoice.detailInvoices = detailInvoices;
        invoice.createdAt = new Date(invoice.createdAt).toLocaleString();
        invoice.totalPrice = invoice.totalPrice.toLocaleString();
        invoice.totalDiscount = invoice.totalDiscount.toLocaleString();
        invoice.paymentPrice = invoice.paymentPrice.toLocaleString();
        // gửi email
        const userInfo = await UserModel.findById(user).populate('account');
        const mail = {
          to: userInfo.account.email,
          subject: 'Hoá đơn thanh toán',
          html: mailConfig.htmlInvoices(invoice),
        };
        //gửi mail
        await mailConfig.sendEmail(mail);
      } else {
        res.redirect(
          `${process.env.FRONTEND_URL}/invoice/${data.transactionId}`
        );
        return;
      }
    } else {
      res.status(500).json({ message: 'Callback not found' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

const getInvoiceInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    let invoice = await InvoiceModel.findOne({
      _id: id,
      status: { $ne: 'Paid' },
    })
      .populate('user')
      .lean();
    if (invoice) {
      let detailInvoices = await DetailInvoiceModel.find({
        invoice: invoice._id,
      }).lean();
      detailInvoices = detailInvoices.map((item) => {
        item.courseCurrentPrice = item.courseCurrentPrice.toLocaleString();
        item.discount = item.discount.toLocaleString();
        item.amount = item.amount.toLocaleString();
        return item;
      });
      invoice.detailInvoices = detailInvoices;
      invoice.createdAt = new Date(invoice.createdAt).toLocaleString();
      invoice.totalPrice = invoice.totalPrice.toLocaleString();
      invoice.totalDiscount = invoice.totalDiscount.toLocaleString();
      invoice.paymentPrice = invoice.paymentPrice.toLocaleString();
      res.render('payment', {
        invoice: invoice,
        url: process.env.FRONTEND_URL,
      });
    } else {
      res.render('paymentErro', {
        message: 'Hoá đơn không tồn tại',
        url: process.env.FRONTEND_URL,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  postPaymentCheckout,
  getPaymentCallback,
  getInvoiceInfo,
};
