# Course Ecommerce - Thesis

[![by hoang nam](https://img.shields.io/badge/By-Hoang%20Nam-green)](https://github.com/pmhnam)
[![npm version](https://img.shields.io/badge/npm-v8.5.5-blue)](https://github.com/courses-ecommerce/apis)
[![GitHub license](https://img.shields.io/badge/license-MIT-c9f)](https://github.com/courses-ecommerce/apis)

Docs: [API Documentation](https://courses-ecommerce-apis.onrender.com/api-docs)

Link Demo Website: [course-ecommerce](https://www.course-ecommerce.tk/)

APIs cho trang web bán khoá học trực tuyến

> Luận văn tốt nghiệp năm 2022

## Công nghệ sử dụng

- Node.js
- Express.js
- Mongodb
- Redis
- Socket.io
- Docker

## Các chức năng chính

### Xác thực người dùng

- Đăng nhập
- Đăng nhập bằng google
- Đăng ký (xác thực email)
- Quên mật khẩu (xác thực email)

### Quản lý khoá học

- CRUD khoá học
- Gợi ý khoá học dựa vào lịch sử tìm kiếm
- Tự động(cron job) gắn tags (hot, bestseller) mỗi tháng dựa vào số lượng bán và doanh thu

### Quản lý phiếu giảm giá

- CRUD phiếu giảm giá
- Export google sheet mã giảm giá

### Quản lý tài khoản người dùng

- CRUD tài khoản người dùng
- Tạo nhiều tài khoản bằng file

### Quản lý danh mục

- CRUD danh mục

### Quản lý hoá đơn

- R hoá đơn

### Quản lý giỏ hàng

- CRUD giỏ hàng

### Khoá học đã mua

- R khoá học đã mua
- Cập nhật tiến trình học, lưu timeline xem bài giảng (HLS)
- Đánh giá khoá học

### Thanh toán

- Thanh toán online qua cổng thanh toán VNPAY

### Thống kê

- Tài khoản người dùng
- Khoá học
- Doanh thu theo tháng, năm, khoảng thời gian (xuất file)
- Doanh thu của các giáo viên theo tháng (xuất file)
- Phiếu giảm giá (xuất file)
- Top giáo viên có doanh thu cao theo tháng, năm
- Top khoá học có số lượng bán cao theo tháng, năm

### Nhắn tin real-time

- Gửi tin nhắn (chỉ hỗ trợ văn bản)
- Nhắn tin riêng tư (không hỗ trợ nhóm)

## Hướng dẫn cài đặt trên windows

Yêu cầu: đã cài đặt nodejs, npm, mongodb và redis (có thể dùng mongo cloud sever, redis cloud sever)

Bước 1: Tải dự án về máy

Mở terminal, gõ lệnh sau:

```bash
git clone https://github.com/courses-ecommerce/apis.git
```

Bước 2: Cài đặt package phụ thuộc

Mở Visual studio code, mở thư mục đã tải ở bước 1. Mở terminal và gõ lệnh:

```bash
npm install
```

Bước 3: Cấu hình

Tạo file `.env` nội dung dựa vào file `.env.example`

Bước 4: Khởi động server

```bash
npm start
```

Bước 5: Truy cập `http://localhost:3000/api-docs` để xem APIs

## License

[MIT](https://choosealicense.com/licenses/mit/)
