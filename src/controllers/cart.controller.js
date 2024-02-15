const CartModel = require('../models/users/cart.model');
const CourseModel = require('../models/courses/course.model')
const helper = require('../helper/index');
const CodeModel = require('../models/code.model');
const MyCourseModel = require('../models/users/myCourse.model');

const handlerCheckoutCart = async (user) => {
    try {
        const carts = await CartModel.find({ user, wishlist: false })
            .populate({
                path: 'course',
                populate: { path: 'author', select: '_id fullName' },
                select: '_id name thumbnail author currentPrice category level wishlist'
            })
            .select('-__v -user')
            .lean()
        const result = await helper.hanlderCheckoutCarts(carts)
        const wishlist = await CartModel.find({ user, wishlist: true })
            .populate({
                path: 'course',
                populate: { path: 'author', select: '_id fullName' },
                select: '_id name thumbnail author currentPrice category level wishlist'
            })
            .select('-__v -user')
            .lean()
        return { result, wishlist, carts }
    } catch (error) {
        console.log(error);
        return { result: { error: true } }
    }
}



// fn: thêm khoá học vào giỏ hàng
const postCart = async (req, res, next) => {
    try {
        const { course } = req.body
        const { user, account } = req
        if (account.role != 'student') {
            return res.status(400).json({ message: 'Tài khoản không thể mua khoá học' })
        }
        // kiểm tra khoá học
        const hadCourse = await CourseModel.findById(course).lean()
        if (!hadCourse) return res.status(400).json({ message: 'mã khoá học không hợp lệ' })
        if (hadCourse.publish == false) {
            return res.status(400).json({ message: 'Khoá học đang phát triển' })
        }
        // kiểm tra đã mua chưa
        const isBuyed = await MyCourseModel.findOne({ user, course }).lean()
        if (isBuyed) return res.status(400).json({ message: 'khoá học đã sỡ hữu' })
        // kiểm tra có trong giỏ chưa
        const inCart = await CartModel.findOne({ user: user._id, course }).lean()
        if (inCart) {
            return res.status(400).json({ message: 'khoá học đã trong giỏ hàng' })
        }

        // thêm khoá học vào giỏ hàng
        await CartModel.create({ user: user._id, course })
        const { result, wishlist, carts } = await handlerCheckoutCart(user)

        return res.status(201).json({ message: 'ok', numOfCarts: carts.length, totalPrice: result.totalPrice, totalDiscount: result.totalDiscount, estimatedPrice: result.estimatedPrice, carts: result.carts, wishlist })
    } catch (error) {
        console.log('> Add cart fail', error);
        return res.status(500).json({ message: error.message })
    }
}


// fn: lấy thông tin giỏ hàng
const getCart = async (req, res, next) => {
    try {
        const { user } = req

        const { result, wishlist, carts } = await handlerCheckoutCart(user)
        if (result.error) {
            return res.status(500).json({ message: error.message })
        }
        return res.status(200).json({ message: 'ok', numOfCarts: carts.length, totalPrice: result.totalPrice, totalDiscount: result.totalDiscount, estimatedPrice: result.estimatedPrice, carts: result.carts, wishlist })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'error' })
    }
}

// fn: cập nhật thông tin giỏ hàng (add coupon code)
const putCart = async (req, res, next) => {
    try {
        const { user } = req
        const { course } = req.params
        const { coupon, wishlist } = req.body
        let message = 'Áp dụng thành công'
        let statusCode = 200
        // lấy giỏ hàng
        const carts = await CartModel.find({ user }).lean()

        // kiểm tra giỏ
        const hadCart = await CartModel.findOne({ user, course }).lean()
        if (!hadCart) return res.status(400).json({ message: 'giỏ hàng không tồn tại' })
        if (wishlist == true || wishlist == false) {
            await CartModel.updateOne({ user, course }, { wishlist })
        }
        if (coupon == '') {
            message = 'Gỡ mã giảm giá thành công'
            await CartModel.updateOne({ user, course }, { coupon })
        }
        else if (coupon && coupon != '') {
            // kiểm tra mã giảm giá
            const code = await CodeModel.findOne({ code: coupon }).populate('coupon').lean()
            if (!code) return res.status(400).json({ message: 'Mã giảm giá không tồn tại' })
            if (!code.isActive) return res.status(400).json({ message: 'Mã giảm giá đã dùng' })

            // kiểm tra mã có đang dùng không
            const isExisted = carts.some(cart => cart.coupon === coupon)
            if (isExisted) return res.status(400).json({ message: 'Mã giảm giá đang dùng' })

            // lấy khoá học
            const c = await CourseModel.findById(course).lean()

            // kiểm tra mã giảm giá có áp dụng được cho khoá học này
            let result = helper.hanlderApplyDiscountCode(c, code)
            message = result.message
            statusCode = result.statusCode
            if (result.isApply) {
                await CartModel.updateOne({ _id: hadCart._id }, { coupon })
            }
        }
        const data = await handlerCheckoutCart(user)
        return res.status(statusCode).json({ message: message, numOfCarts: data.result.carts.length, totalPrice: data.result.totalPrice, totalDiscount: data.result.totalDiscount, estimatedPrice: data.result.estimatedPrice, carts: data.result.carts, wishlist: data.wishlist })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}


// fn: loại bỏ khoá học khỏi giỏ hàng
const deleteCart = async (req, res, next) => {
    try {
        const { user } = req
        const { course } = req.params
        await CartModel.deleteOne({ user, course })
        const { result, wishlist, carts } = await handlerCheckoutCart(user)
        return res.status(200).json({ message: 'ok', numOfCarts: carts.length, totalPrice: result.totalPrice, totalDiscount: result.totalDiscount, estimatedPrice: result.estimatedPrice, carts: result.carts, wishlist })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


module.exports = {
    postCart,
    getCart,
    putCart,
    deleteCart,
}