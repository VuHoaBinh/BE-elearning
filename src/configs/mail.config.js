// main.js
const nodemailer = require('nodemailer')

// configure option
const option = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODE_MAIL_USER,
    pass: process.env.NODE_MAIL_PASSWORD,
  },
}

const transporter = nodemailer.createTransport(option)

// send email
const sendEmail = async ({ to, subject, text, html, ...rest }) => {
  try {
    const res = await transporter.verify()
    if (res) {
      //config mail
      const mail = {
        //sender access
        from: '"E-Learning website" <no-reply@accounts.ht.com>',
        //receiver access
        to,
        //subject
        subject,
        //content text
        text,
        //html
        html,
        //others
        ...rest,
      }
      //Tiến hành gửi email
      const result = await transporter.sendMail(mail)
      return { result }
    }
    throw new Error('> An error occurred while sending the email')
  } catch (err) {
    console.error('ERROR MAILER: ', err)
    return { err }
  }
}

const headerHtmlMail = `<h1 style="color: #4c649b; font-size: 48px; border-bottom: solid 2px #ccc;padding-bottom: 10px">
ANH NGỮ SPARKLE <br />
    </h1>`
const footerHtmlVerifyMail = `<h1>Cảm ơn./.</h1>`

// gửi mã xác nhận
const htmlSignupAccount = (token) => {
  return `<div>
    ${headerHtmlMail}
    <h2 style="padding: 10px 0; margin-bottom: 10px;">
        Xin chào,<br />
        Mã xác nhận đăng ký tài khoản cho website ANH NGỮ SPARKLE của bạn.<br />
    </h2>
    <h3 style="background: #eee;padding: 10px;">
      <i><b>${token}</b></i>
    </h3>
    <h3 style="color: red">
        Chú ý: Không đưa mã này cho bất kỳ ai,
        có thể dẫn đến mất tài khoản.<br />
        Mã chỉ có hiệu lực <i>10 phút </i> từ khi bạn nhận được mail.
    </h3>
  ${footerHtmlVerifyMail}
  </div>`
}

// gửi mã đổi mật khẩu
const htmlResetPassword = (token) => {
  return `<div>
    ${headerHtmlMail}
    <h2 style="padding: 10px 0; margin-bottom: 10px;">
        Xin chào,<br />
        ANH NGỮ SPARKLE đã nhận được yêu cầu lấy lại mật khẩu từ bạn.<br />
        Đừng lo lắng, hãy nhập mã này để khôi phục:
    </h2>
    <h1 style="background: #eee;padding: 10px;">
      <i><b>${token}</b></i>
    </h1>
    <h3 style="color: red">
        Chú ý: Không đưa mã này cho bất kỳ ai,
        có thể dẫn đến mất tài khoản.<br />
        Mã chỉ có hiệu lực <i>10 phút </i> từ khi bạn nhận được mail.
    </h3>
    ${footerHtmlVerifyMail}
  </div>`
}

// gửi thông báo đăng nhập sai quá nhiều
const htmlWarningLogin = () => {
  return `<div>
   ${headerHtmlMail}
    <h2 style="padding: 10px 0; margin-bottom: 10px;">
        Xin Chào anh (chị),<br />
        Cửa hàng nghi ngờ có ai đó đã cố gắng đăng nhập vào tài khoản của quý khách.<br />
        Nếu quý khác không nhớ mật khẩu hãy nhấn vào "Quên mật khẩu" để lấy lại mật khẩu<br/>
    </h2>
    <h1>Cảm ơn.</h1>
  </div>`
}

// gửi mã đổi mật khẩu
const htmlInvoices = (invoice) => {
  let html = `
  <div marginwidth="0" marginheight="0">
  <center>
    <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
      <tbody>
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td align="center" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td valign="top">
                          <a href="${process.env.FRONTEND_URL}" target="_blank"
                          data-saferedirecturl="https://www.google.com/url?q=https://hnam.works&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw2VmFgDLPl3zdTFRyVOzKJX">
                          <img src="https://i.ytimg.com/vi/D_uTgNVxHoc/maxresdefault.jpg" style="max-width:600px;padding:20px" id="m_-4654180294300959301headerImage"
                            alt="course-ecommerce.tk" class="CToWUd">
                        </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td valign="top">
                            <p>Kính gửi ${invoice.user.fullName}</p>
                            <p>
                              Đây là thông
                              báo của hệ
                              thống về một
                              hóa đơn đã
                              được tạo lúc ${invoice.createdAt}.
                            </p>
                            <p>
                              Phương thức
                              thanh toán đã
                              chọn là:
                              ${invoice.paymentMethod}
                            </p>
                            <p>
                              <strong>Invoice #${invoice._id}</strong><br>
                              Tổng số tiền: ${invoice.totalPrice} vnđ<br>
                              Tổng giảm giá: ${invoice.totalDiscount} vnđ<br>
                              Tổng thanh toán: ${invoice.paymentPrice} vnđ<br>
                            </p>
                            <p>
                              <strong>
                                Khoá học:
                              </strong>
                            </p>`
  invoice.detailInvoices.forEach((item) => {
    html += `------------------------------<wbr>------------------------
      <p> <a href="${process.env.FRONTEND_URL}/courses/${item.courseSlug}">${item.courseName}</a><br>
      Giá: ${item.courseCurrentPrice} vnđ<br>
      Giảm giá: ${item.discount} vnđ<br>
      Tạm tính: ${item.amount} vnđ<br>
      ------------------------------<wbr>------------------------<br>`
  })
  html += `<tr>
                    <td align="center" valign="top">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tbody>
                          <tr>
                            <td valign="top">
                              <a href="${process.env.FRONTEND_URL}/" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=https://manage.maxserver.com&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw2VmFgDLPl3zdTFRyVOzKJX">visit
                                our
                                website</a>
                              <span>
                                | </span>
                              <a href="${process.env.FRONTEND_URL}/" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=${process.env.FRONTEND_URL}/&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw3tvOSiz7rRt2mIv3atFN8Z">log
                                in to your
                                account</a>
                              <span>
                                | </span>
                              <a href="${process.env.FRONTEND_URL}/submitticket.php" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=${process.env.FRONTEND_URL}/submitticket.php&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw1VbMkzl8ZCE0eOQRtVvs7A">get
                                support</a>
                              <br>
                              Copyright ©
                              hnam.works,
                              All rights
                              reserved.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
  </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</center>
<div class="yj6qo"></div>
<div class="adL">
</div>
</div>`
  return html
}

// gửi thông báo không phê duyệt khoá học
const htmlDenyCourse = (user, course, content) => {
  let html = `
  <div marginwidth="0" marginheight="0">
  <center>
    <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" width="100%">
      <tbody>
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0">
              <tbody>
                <tr>
                  <td align="center" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td valign="top">
                            <a href="${process.env.FRONTEND_URL}" target="_blank"
                              data-saferedirecturl="https://www.google.com/url?q=https://hnam.works&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw2VmFgDLPl3zdTFRyVOzKJX">
                              <img src="https://i.ytimg.com/vi/D_uTgNVxHoc/maxresdefault.jpg" style="max-width:600px;padding:20px" id="m_-4654180294300959301headerImage"
                                alt="course-ecommerce.tk" class="CToWUd">
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tbody>
                        <tr>
                          <td valign="top">
                            <p>Kính gửi <b>${user.fullName}</b></p>
                            <p>
                              Đây là thông
                              báo của hệ
                              thống về việc <b>từ chối duyệt khoá học</b>
                            </p>
                            <p>
                            <a href="${process.env.FRONTEND_URL}/courses/${course.slug}">${course.name}</a>
                            </p>
                            <p>
                              <b>Lý do</b>:
                              ${content}
                            </p>
                            <tr>
                    <td align="center" valign="top">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tbody>
                          <tr>
                            <td valign="top">
                              <a href="${process.env.FRONTEND_URL}/" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=https://manage.maxserver.com&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw2VmFgDLPl3zdTFRyVOzKJX">visit
                                our
                                website</a>
                              <span>
                                | </span>
                              <a href="${process.env.FRONTEND_URL}/" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=${process.env.FRONTEND_URL}/&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw3tvOSiz7rRt2mIv3atFN8Z">log
                                in to your
                                account</a>
                              <span>
                                | </span>
                              <a href="${process.env.FRONTEND_URL}/submitticket.php" target="_blank"
                                data-saferedirecturl="https://www.google.com/url?q=${process.env.FRONTEND_URL}/submitticket.php&amp;source=gmail&amp;ust=1655487285912000&amp;usg=AOvVaw1VbMkzl8ZCE0eOQRtVvs7A">get
                                support</a>
                              <br>
                              Copyright ©
                              hnam.works,
                              All rights
                              reserved.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
  </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</center>
<div class="yj6qo"></div>
<div class="adL">
</div>
</div>`

  return html
}

module.exports = {
  sendEmail,
  htmlSignupAccount,
  htmlResetPassword,
  htmlWarningLogin,
  htmlInvoices,
  htmlDenyCourse,
}
