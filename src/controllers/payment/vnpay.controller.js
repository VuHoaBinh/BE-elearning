const { VNPay } = require('vn-payments');

// config merchant vnpay
const vnpay = new VNPay({
    paymentGateway: process.env.PAYMENT_GATEWAY,
    merchant: process.env.MERCHANT_CODE,
    secureSecret: process.env.SECURE_SECRET,
});


const checkoutVNPay = async (req, res, next) => {
    try {
        const checkoutData = res.locals.checkoutData;
        checkoutData.returnUrl = `http://${req.headers.host}/api/payment/vnpay/callback`

        // checkout thông tin và redirect tới payment gate
        return vnpay.buildCheckoutUrl(checkoutData)
            .then(checkoutUrl => {
                res.locals.checkoutUrl = checkoutUrl
                return checkoutUrl;
            })
    } catch (error) {
        console.log(error);
        next(error)
    }
}


const callbackVNPay = async (req, res, next) => {
    // thông tin trả về sau khi thanh toán
    const query = req.query;
    // kiểm tra thông tin trả về
    var results = await vnpay.verifyReturnUrl(query);
    if (results) {
        switch (results.vnp_ResponseCode) {
            case '00':
                results.message = 'Thanh toán thành công'
                results.isSuccess = true
                break;
            case '07':
                results.message = 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).'
                results.isSuccess = true
                break;
            case '09':
                results.message = 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.'
                results.isSuccess = false
                break;
            case '10':
                results.message = 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần'
                results.isSuccess = false
                break;
            case '11':
                results.message = 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.'
                results.isSuccess = false
                break;
            case '12':
                results.message = 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.'
                results.isSuccess = false
                break;
            case '13':
                results.message = 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.                '
                results.isSuccess = false
                break;
            case '13':
                results.message = 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.                '
                results.isSuccess = false
                break;
            case '24':
                results.message = 'Giao dịch không thành công do: Khách hàng hủy giao dịch'
                results.isSuccess = false
                break;
            case '51':
                results.message = 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.'
                results.isSuccess = false
                break;
            case '65':
                results.message = 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.'
                results.isSuccess = false
                break;
            case '75':
                results.message = 'Ngân hàng thanh toán đang bảo trì.'
                results.isSuccess = false
                break;
            case '79':
                results.message = 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch'
                results.isSuccess = false
                break;
            case '99':
                results.message = 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)'
                results.isSuccess = false
                break;
        }

        return results
    } else {
        return undefined
    }
}


module.exports = {
    checkoutVNPay,
    callbackVNPay,
}