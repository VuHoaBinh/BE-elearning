const CouponModel = require("../models/coupon.model");
const CourseModel = require("../models/courses/course.model");
const InvoiceModel = require("../models/invoice.model");
const UserModel = require("../models/users/user.model");
var xlsx = require("node-xlsx").default;
var fs = require("fs");
const AccountModel = require("../models/users/account.model");
const DetailInvoiceModel = require("../models/detailInvoice.model");
const _ = require("lodash");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

// fn: thống kê doanh thu từ ngày a đến b
const getDailyRevenue = async (req, res) => {
  try {
    // type = 'day', 'month'
    let now = Date.now();
    let oneMonthAgo = new Date(
      new Date().setMonth(new Date().getMonth() - 2)
    ).getTime();
    let {
      start = oneMonthAgo,
      end = now,
      type = "day",
      exports = "false",
    } = req.query;
    let startDate = new Date(parseInt(start));
    let endDate = new Date(parseInt(end));

    // tính khoản cách giữa 2 ngày
    let numberOfDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    if (numberOfDays > 31) {
      type = "month";
    }

    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          status: "Paid",
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        },
      },
    ]);
    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice;
      // i.paymentPrice = i.paymentPrice * 0.2
      return i;
    });

    var result = null;
    var preResult = null;
    if (type.toLowerCase().trim() == "day") {
      let differenceInTime = endDate.getTime() - startDate.getTime();
      let differenceInDays = differenceInTime / (1000 * 3600 * 24);
      result = {};
      preResult = [];
      let startDateISO = new Date(startDate);
      for (let i = 0; i < differenceInDays + 1; i++) {
        let startDateString = startDateISO.toISOString().split("T")[0];
        preResult.push({ date: startDateString, value: 0 });
        result[startDateString] = 0;
        startDateISO.setDate(startDateISO.getDate() + 1);
      }
      // tính doanh thu mỗi ngày
      preResult.forEach((item) => {
        invoices.forEach((invoice) => {
          let dateString = invoice.createdAt;
          if (item.date == dateString) {
            item.value += invoice.paymentPrice;
          }
        });
      });
      invoices.forEach((invoice) => {
        let dateString = invoice.createdAt;
        result[dateString] += invoice.paymentPrice;
      });
    } else if (type.toLowerCase().trim() == "month") {
      startMonth = startDate.getMonth();
      startYear = startDate.getFullYear();
      endMonth = endDate.getMonth();
      endYear = endDate.getFullYear();

      let numOfMonth =
        (endYear - startYear - 1) * 12 + 12 - startMonth + 1 + endMonth;
      result = {};
      preResult = [];
      for (let i = 0; i < numOfMonth; i++) {
        let dateString = startDate.toISOString().slice(0, 7);
        preResult.push({ date: dateString, value: 0 });
        result[dateString] = 0;
        startDate.setMonth(startDate.getMonth() + 1);
      }
      // tính doanh thu mỗi tháng
      preResult.forEach((item) => {
        invoices.forEach((invoice) => {
          let dateString = invoice.createdAt.slice(0, 7);
          if (item.date == dateString) {
            item.value += invoice.paymentPrice;
          }
        });
      });
      invoices.forEach((invoice) => {
        let dateString = invoice.createdAt.slice(0, 7);
        result[dateString] += invoice.paymentPrice;
      });
    }
    if (exports.toLowerCase().trim() == "true") {
      const data = [
        [
          `BẢNG THỐNG KÊ DOANH THU THEO ${
            type == "day" ? "NGÀY" : "THÁNG"
          } TỪ ${startDate.toISOString().split("T")[0]} ĐẾN ${
            endDate.toISOString().split("T")[0]
          }`,
        ],
        [`${type == "day" ? "NGÀY" : "THÁNG"}`, `Doanh thu (vnđ)`],
      ];
      for (const key in result) {
        data.push([key, result[key]]);
      }
      const range = { s: { c: 0, r: 0 }, e: { c: 10, r: 0 } }; // A1:A4
      const sheetOptions = { "!merges": [range] };
      var buffer = xlsx.build([{ name: "Thống kê doanh thu", data: data }], {
        sheetOptions,
      }); // Returns a buffer
      fs.createWriteStream(
        "./src/public/statistics/thong-ke-doanh-so-theo-ngay.xlsx"
      ).write(buffer);
      return res.status(200).json({
        message: "ok",
        result: preResult,
        file: "/statistics/thong-ke-doanh-so-theo-ngay.xlsx",
      });
    }

    res.status(200).json({ message: "ok", result: preResult });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// fn: thống kê doanh thu theo tháng trong năm x và so sánh vs năm x -1
const getMonthlyRevenue = async (req, res, next) => {
  try {
    var { year } = req.params;
    var { exports = "false", number = 0 } = req.query;
    number = parseInt(number);
    year = parseInt(year);

    // lấy danh sách hoá đơn đã thanh toán trong năm year và năm year - 1
    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year - number}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
          status: "Paid",
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        },
      },
    ]);
    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice;
      // i.paymentPrice = i.paymentPrice * 0.2
      return i;
    });

    // doanh thu mỗi tháng
    var result = Array(number + 1).fill(Array(12).fill(0));
    result = JSON.stringify(result);
    result = JSON.parse(result);
    // tính toán doanh thu mỗi tháng
    invoices.forEach((item) => {
      const m = new Date(item.createdAt).getMonth();
      const y = new Date(item.createdAt).getFullYear();
      result[y - year + number][m] += item.paymentPrice;
    });
    let preResult = result.map((item, index) => {
      item = { year: year + index - result.length + 1, data: item };
      return item;
    });

    if (exports.toLowerCase().trim() == "true") {
      const data = [
        [`BẢNG THỐNG KÊ DOANH THU NĂM ${year - number} - ${year}`],
        [
          null,
          "Tháng 1",
          "Tháng 2",
          "Tháng 3",
          "Tháng 4",
          "Tháng 5",
          "Tháng 6",
          "Tháng 7",
          "Tháng 8",
          "Tháng 9",
          "Tháng 10",
          "Tháng 11",
          "Tháng 12",
        ],
      ];
      for (let i = 0; i < result.length; i++) {
        data.push([`Năm ${year - number + i}`, ...result[i]]);
      }

      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } }; // A1:A4
      const sheetOptions = { "!merges": [range] };
      var buffer = xlsx.build([{ name: "Thống kê doanh thu", data: data }], {
        sheetOptions,
      }); // Returns a buffer
      fs.createWriteStream(
        "./src/public/statistics/thong-ke-doanh-so-theo-thang.xlsx"
      ).write(buffer);
      return res.status(200).json({
        message: "ok",
        result: preResult,
        file: "/statistics/thong-ke-doanh-so-theo-thang.xlsx",
      });
    }

    res.status(200).json({ message: "ok", result: preResult });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// fn: doanh thu theo năm
const getYearlyRevenue = async (req, res) => {
  try {
    const {
      start = new Date().getFullYear() - 1,
      end = new Date().getFullYear(),
      exports = "false",
    } = req.query;

    var invoices = await InvoiceModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${start}-01-01`),
            $lte: new Date(`${end}-12-31`),
          },
          status: "Paid",
        },
      },
      {
        $project: {
          paymentPrice: 1,
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        },
      },
    ]);

    // hệ thống chỉ lấy 20% giá trị của hoá đơn. 80% là của teacher
    invoices = invoices.map((i) => {
      i.paymentPrice = i.paymentPrice;
      // i.paymentPrice = i.paymentPrice * 0.2
      return i;
    });

    var result = [...Array(parseInt(end) - parseInt(start) + 1).fill(0)];

    invoices.forEach((item) => {
      const index = new Date(item.createdAt).getFullYear() - parseInt(start);
      result[index] += item.paymentPrice;
    });

    let preResult = result.map((item, index) => {
      item = { year: parseInt(start) + index, data: item };
      return item;
    });

    let raise =
      (result[parseInt(end) - parseInt(start)] * 100) / result[0] - 100;

    if (exports.toLowerCase().trim() == "true") {
      const data = [
        [`BẢNG THỐNG KÊ DOANH THU TỪ NĂM ${start} - ${end}`],
        ["Năm"],
        [
          `Doanh thu`,
          ...result,
          `Doanh thu ${end} ${raise >= 0 ? "tăng" : "giảm"} ${Math.abs(
            raise
          )}% so với năm ${start}`,
        ],
      ];
      for (let i = parseInt(start); i < parseInt(end) + 1; i++) {
        data[1].push(i);
      }
      const range = { s: { c: 0, r: 0 }, e: { c: 12, r: 0 } }; // A1:A4
      const sheetOptions = { "!merges": [range] };
      var buffer = xlsx.build([{ name: "Thống kê doanh thu", data: data }], {
        sheetOptions,
      }); // Returns a buffer
      fs.createWriteStream(
        "./src/public/statistics/thong-ke-doanh-so-theo-nam.xlsx"
      ).write(buffer);
      return res.status(200).json({
        message: "ok",
        result: preResult,
        file: "/statistics/thong-ke-doanh-so-theo-nam.xlsx",
      });
    }
    res.status(200).json({ message: "ok", result: preResult });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDailyRevenue,
  getMonthlyRevenue,
  getYearlyRevenue,
};
