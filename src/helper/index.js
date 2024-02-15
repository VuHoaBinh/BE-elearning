const VerifyModel = require('../models/users/verify.model');
const constants = require('../constants/index');
const { cloudinary } = require('../configs/cloudinary.config');
const urlSlug = require('url-slug')
const CartModel = require('../models/users/cart.model');
const CourseModel = require('../models/courses/course.model')
const CouponModel = require('../models/coupon.model')
const { getVideoDurationInSeconds } = require('get-video-duration')
var voucher_codes = require('voucher-code-generator');
const CodeModel = require('../models/code.model');
var QRCode = require('qrcode')


// fn: upload image to cloudinary
const uploadImageToCloudinary = async (imageFile, name, folder = 'thumbnail') => {
    try {
        let slug = urlSlug(name)
        const result = await cloudinary.uploader.upload(imageFile.path, {
            folder: folder,
            public_id: `${slug}`,
            upload_preset: folder // chỉnh sửa size ảnh cho phù hợp 
        })
        const { secure_url } = result;
        return secure_url;
    } catch (error) {
        console.log(error, '===ERROR====uploadImageToCloudinary==');
        if (folder == 'thumbnail') {
            return 'https://res.cloudinary.com/dtbazi1zt/image/upload/v1653155326/thumbnail/l3g5x9yl.png';
        } else {
            return 'https://res.cloudinary.com/dtbazi1zt/image/upload/v1653154696/avatar/l3g5jrl7.png';
        }
    }
}

// fn: upload video to cloudinary
const uploadVideoToCloudinary = async (video, id, timestamp = Date.now()) => {
    try {
        // const result = await cloudinary.uploader.upload_large(video.path, {
        //     resource_type: 'video',
        //     public_id: `videos/${id}-${Date.now()}`,
        //     chunk_size: 6000000,
        //     eager: [
        //         { streaming_profile: 'hd', format: 'm3u8' },
        //     ]
        // })
        const result = await cloudinary.uploader.upload(video.path, {
            resource_type: 'video',
            public_id: `videos/${id}-${timestamp}`,
            eager: [
                { streaming_profile: 'hd', format: 'm3u8' },
            ]
        })
        return result
    } catch (error) {
        console.log(error);
        return { error }
    }
}

// fn: upload file to cloudinary
const uploadFileToCloudinary = async (file, id) => {
    try {
        const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'raw',
            public_id: `files/${id}-${Date.now()}`
        })
        return result
    } catch (error) {
        console.log(error);
        return { error }
    }
}

// fn: xoá resoure bằng public id
const destroyResoureInCloudinary = async (name, resource_type) => {
    try {
        const result = await cloudinary.uploader.destroy(name, { resource_type: resource_type })
        return result
    } catch (error) {
        return error
    }
}

//fn: tạo mã xác thực
const generateVerifyCode = (numberOfDigits) => {
    //random một số từ 1 -> 10^numberOfDigits
    const n = parseInt(numberOfDigits);
    const number = Math.floor(Math.random() * Math.pow(10, n)) + 1;
    let numberStr = number.toString();
    const l = numberStr.length;
    for (let i = 0; i < 6 - l; ++i) {
        numberStr = '0' + numberStr;
    }
    return numberStr;
};

//fn: kiểm tra mã xác thực
const isVerifyEmail = async (email, verifyCode) => {
    try {
        const res = await VerifyModel.findOne({ email });
        if (res) {
            const { code, dateCreated } = res;
            if (code !== verifyCode) return false;
            const now = Date.now();
            // kiểm tra mã còn hiệu lực hay không
            if (now - dateCreated > constants.VERIFY_CODE_TIME_MILLISECONDS)
                return false;
            return true;
        }
        return false;
    } catch (error) {
        console.error(error);
        return false;
    }
};


//fn: xử lý tính toán giỏ hàng
const hanlderCheckoutCarts = async (carts) => {
    try {
        // tính toán tiền ước tính
        var totalDiscount = 0
        var totalPrice = 0
        for (let i = 0; i < carts.length; i++) {
            var cart = carts[i];
            var { course, coupon } = cart
            let code = await CodeModel.findOne({ code: coupon }).populate('coupon').lean()
            cart.course.discount = 0
            if (!code) {
                totalPrice += course.currentPrice
                continue
            }
            const result = hanlderApplyDiscountCode(course, code)
            if (result.isApply == true) {
                if (result.discountAmount < course.currentPrice) {
                    cart.course.discount = result.discountAmount
                } else {
                    cart.course.discount = course.currentPrice
                }
            }
            totalDiscount += cart.course.discount
            totalPrice += course.currentPrice
        }
        let estimatedPrice = totalPrice - totalDiscount

        return { totalPrice, totalDiscount, estimatedPrice, carts }
    } catch (error) {
        console.log(error);
        return { error }
    }
}

//fn: kiểm tra mã giảm giá cho khoá học
const hanlderApplyDiscountCode = (course, code) => {
    try {
        var message = 'Không đủ điều kiện'
        var statusCode = 400
        // kiểm tra khoá học miễn phí
        if (course.currentPrice == 0) {
            return { isApply: false, statusCode, discountAmount: 0, message: 'Không thể áp dụng cho khoá học miễn phí.' }
        }

        // kiểm tra mã đã dùng chưa
        if (code.isActive == false) {
            return { isApply: false, statusCode, discountAmount: 0, message: 'Mã giảm giá đã dùng' }
        }
        // kiểm tra hết hạn
        const isExpired = new Date(code.coupon.expireDate) < new Date()
        if (isExpired) {
            return { isApply: false, statusCode, discountAmount: 0, message: 'Mã giảm giá đã hết hạn' }
        }

        // giá tối tiểu <= giá khoá học && số lượng >= 1
        let isApply = code.coupon.minPrice <= course.currentPrice
        // kiểm tra loại áp dung
        switch (code.coupon.apply) {
            case 'all':
                break
            case 'author':
                // tác giả mã == tác giả khoá học && giá tối tiểu <= giá khoá học && số lượng >= 1
                isApply = JSON.stringify(code.coupon.author) == JSON.stringify(course.author._id) && isApply
                break
            default:
                isApply = false
        }
        // tính tiền giảm nếu áp dụng thành công
        let discountAmount = 0
        if (isApply) {
            message = 'Áp dụng thành công'
            statusCode = 200
            // tính tiền giảm giá theo tiền mặt và giảm giá %
            discountAmount = code.coupon.type === 'money' ? code.coupon.amount : code.coupon.amount * course.currentPrice / 100
            // tiền giảm giá có vượt giá trị giảm tối đa ?
            if (discountAmount > code.coupon.maxDiscount) {
                discountAmount = code.coupon.maxDiscount
            }
        }

        return { isApply, statusCode, discountAmount, message }
    } catch (error) {
        console.log(error);
        return { isApply: false, statusCode: 400, discountAmount: 0, message: 'Mã lỗi' }
    }
}

//fn: lấy thời lượng video
const getVideoDuration = async (videoPath) => {
    try {
        var duration = null
        if (process.env.NODE_ENV == 'production') {
            try {
                duration = await getVideoDurationInSeconds(videoPath, '/apps/apis/node_modules/@ffprobe-installer/linux-x64/ffprobe')
            } catch (error) {
                duration = await getVideoDurationInSeconds(videoPath)
            }
        } else {
            duration = await getVideoDurationInSeconds(videoPath)
        }
        return duration
    } catch (error) {
        return 0
    }
}

// fn: tạo mã giảm giá
const generateDiscountCode = (length = 10, number = 1) => {
    return voucher_codes.generate({
        length: length,
        count: number,
        charset: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    });

}

// tạo qr code
const generateQR = async text => {
    try {
        return await QRCode.toDataURL(text)
    } catch (err) {
        return null
    }
}

module.exports = {
    generateVerifyCode,
    isVerifyEmail,
    uploadImageToCloudinary,
    hanlderCheckoutCarts,
    getVideoDuration,
    uploadVideoToCloudinary,
    uploadFileToCloudinary,
    generateDiscountCode,
    hanlderApplyDiscountCode,
    generateQR
};
