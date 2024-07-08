const UserModel = require("../models/users/user.model");
const AccountModel = require("../models/users/account.model");
const TeacherModel = require("../models/users/teacher.model");
const CourseModel = require("../models/courses/course.model");
const mongoose = require("mongoose");
const DetailInvoiceModel = require("../models/detailInvoice.model");
const ChapterModel = require("../models/courses/chapter.model");
const ObjectId = mongoose.Types.ObjectId;
var xlsx = require("node-xlsx").default;
var fs = require("fs");
const ExamModel = require("../models/courses/exam.model");

// fn: lấy list khoá học đã tạo
const getMyCourses = async (req, res, next) => {
  try {
    const { user } = req;
    const { page = 1, limit = 10, sort, name, status = "all" } = req.query;

    let query = [
      { $match: { author: user._id } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ];
    if (name) {
      query.unshift({
        $match: { $text: { $search: name } },
      });
    }
    if (status && status != "all") {
      query.splice(1, 0, { $match: { status: status } });
    }
    // sắp xếp và thống kê
    if (sort) {
      let [f, v] = sort.split("-");
      let sortBy = {};
      if (f == "score") {
        query.push({ $sort: { score: { $meta: "textScore" }, rating: -1 } });
      } else if (f == "rating") {
        sortBy["rating.rate"] = v == "asc" || v == 1 ? 1 : -1;
        query.push({ $sort: sortBy });
      } else {
        sortBy[f] = v == "asc" || v == 1 ? 1 : -1;
        query.push({ $sort: sortBy });
      }
    }

    const courses = await CourseModel.aggregate(query);
    query.push({ $count: "total" });
    const totalCourse = await CourseModel.aggregate(query);
    let total = totalCourse[0]?.total || 0;
    res.status(200).json({ message: "ok", total, courses });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error" });
  }
};

// fn: lấy chi tiết khoá học đã tạo
const getDetailMyCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    const course = await CourseModel.aggregate([
      {
        $match: { _id: ObjectId(id) },
      },
      {
        // tính rate trung bình
        $lookup: {
          from: "rates",
          localField: "_id",
          foreignField: "course",
          pipeline: [
            {
              $group: {
                _id: "$course",
                rate: { $avg: "$rate" },
                numOfRate: { $count: {} },
                star5: { $sum: { $cond: [{ $eq: ["$rate", 5] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ["$rate", 4] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ["$rate", 3] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ["$rate", 2] }, 1, 0] } },
                star1: { $sum: { $cond: [{ $eq: ["$rate", 1] }, 1, 0] } },
              },
            },
          ],
          as: "rating",
        },
      },
      {
        // unwind rating
        $unwind: {
          path: "$rating",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // lookup user
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        // unwind author
        $unwind: "$author",
      },
      {
        // lookup categorys
        $lookup: {
          from: "categorys",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        // unwind category
        $unwind: "$category",
      },
      {
        // lookup chapters
        $lookup: {
          from: "chapters",
          localField: "_id",
          foreignField: "course",
          as: "chapters",
        },
      },
      {
        $unwind: {
          path: "$chapters",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { "chapters.number": 1 } },

      {
        // lookup lessons
        $lookup: {
          from: "lessons",
          let: { chapterId: "$chapters._id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$chapterId", "$chapter"] } } },
            { $sort: { number: 1 } },
          ],
          as: "chapters.lessons",
        },
      },
      {
        // group
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          slug: { $first: "$slug" },
          category: { $first: "$category" },
          thumbnail: { $first: "$thumbnail" },
          description: { $first: "$description" },
          lang: { $first: "$lang" },
          intendedLearners: { $first: "$intendedLearners" },
          requirements: { $first: "$requirements" },
          targets: { $first: "$targets" },
          level: { $first: "$level" },
          currentPrice: { $first: "$currentPrice" },
          originalPrice: { $first: "$originalPrice" },
          saleOff: { $first: "$saleOff" },
          rating: { $first: "$rating" },
          author: { $first: "$author" },
          hashtags: { $first: "$hashtags" },
          publish: { $first: "$publish" },
          status: { $first: "$status" },
          chapters: { $push: "$chapters" },
        },
      },
      {
        $project: {
          slug: 1,
          name: 1,
          "category._id": 1,
          "category.name": 1,
          "category.slug": 1,
          thumbnail: 1,
          description: 1,
          lang: 1,
          intendedLearners: 1,
          requirements: 1,
          targets: 1,
          level: 1,
          currentPrice: 1,
          originalPrice: 1,
          saleOff: 1,
          sellNumber: 1,
          "rating.rate": 1,
          "rating.numOfRate": 1,
          "rating.star5": 1,
          "rating.star4": 1,
          "rating.star3": 1,
          "rating.star2": 1,
          "rating.star1": 1,
          "author._id": 1,
          "author.fullName": 1,
          hashtags: 1,
          publish: 1,
          status: 1,
          chapters: 1,
        },
      },
    ]);
    if (course[0]) {
      if (!course[0].chapters[0]?.name) {
        course[0].chapters = [];
      }
      return res.status(200).json({ message: "ok", course: course[0] });
    }

    res.status(404).json({ message: "không tìm thấy" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// fn: lấy info teacher
const getMyInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = (
      await UserModel.aggregate([
        { $match: { _id: ObjectId(id) } },
        {
          $lookup: {
            from: "teachers",
            localField: "_id",
            foreignField: "user",
            as: "teacher",
          },
        },
        {
          $unwind: "$teacher",
        },
        {
          $project: {
            "teacher.user": 0,
          },
        },
      ])
    )[0];
    if (!user) {
      return res.status(404).json({ message: "Not found" });
    }
    res.status(200).json({ message: "oke", user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

//fn: cập nhật teacher info
const putMyInfo = async (req, res, next) => {
  try {
    const { user } = req;
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([_, v]) => v != null)
    );
    if (data.isVerified) {
      delete data.isVerified;
    }
    const teacher = await TeacherModel.findOneAndUpdate(
      { user: user._id },
      data,
      { new: true }
    );
    res.status(200).json({ message: "update oke", teacher });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "error" });
  }
};

//fn: lấy thống kê doanh thu theo tháng
const getMyRevenue = async (req, res, next) => {
  try {
    const {
      start = Date.now(),
      end = Date.now() - 1000 * 60 * 60 * 24 * 30,
      exports = "false",
    } = req.query;
    let startDate = new Date(parseInt(start));
    let endDate = new Date(
      new Date().setDate(new Date(parseInt(end)).getDate() + 1)
    );
    const { _id } = req.user;
    let query = [
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $lookup: {
          from: "accounts",
          localField: "account",
          foreignField: "_id",
          as: "account",
        },
      },
      {
        $unwind: "$account",
      },
      {
        $project: {
          fullName: 1,
          phone: 1,
          birthday: 1,
          gender: 1,
          account: { email: 1, role: 1 },
        },
      },
    ];
    // lấy data teacher
    const teacher = (await UserModel.aggregate(query))[0];
    if (!teacher) {
      return res.status(404).json({ message: "Not found" });
    }
    // lấy hoá đơn có tác giả in users id
    const invoices = await DetailInvoiceModel.aggregate([
      {
        $match: {
          courseAuthor: teacher._id,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $project: {
          invoice: 1,
          courseId: 1,
          courseSlug: 1,
          courseName: 1,
          courseThumbnail: 1,
          courseCurrentPrice: 1,
          amount: 1,
          discount: 1,
          courseAuthor: 1,
          createdAt: {
            $dateToString: {
              date: "$createdAt",
              format: "%d-%m-%Y",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        },
      },
    ]);
    teacher.revenue = 0;
    teacher.discount = 0;
    teacher.numOfDetailInvoice = invoices.length;
    invoices.forEach((item) => {
      teacher.revenue += item.amount * 0.8;
      teacher.discount += item.discount;
    });
    const detailInvoices = invoices.map((item) => {
      item.amount = item.amount * 0.8;
      return item;
    });

    if (exports == "true") {
      const data = [
        [
          `BẢNG THỐNG KÊ DOANH THU TỪ NGÀY ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        ],
        ["ID", "Tên", "Giá", "Giảm giá", "Tổng"],
      ];
      invoices.forEach((item) => {
        let slug = item.courseSlug;
        let name = item.courseName;
        let price = item.courseCurrentPrice;
        let discount = item.discount;
        let amount = item.amount;
        data.push([slug, name, price, discount, amount]);
      });
      data.push([null, null, null, "Tổng", (teacher.revenue * 10) / 8]);
      data.push([null, null, null, "Khấu hao", 0.2]);
      data.push([null, null, null, "Tổng nhận thực tế", teacher.revenue]);

      const range = { s: { c: 0, r: 0 }, e: { c: 8, r: 0 } }; // A1:A4
      const sheetOptions = { "!merges": [range] };
      var buffer = xlsx.build([{ name: "Thống kê doanh thu", data: data }], {
        sheetOptions,
      }); // Returns a buffer
      fs.createWriteStream(
        "./src/public/statistics/thong-ke-doanh-thu-giang-vien.xlsx"
      ).write(buffer);
      return res
        .status(200)
        .json({
          message: "ok",
          teacher,
          detailInvoices,
          file: "/statistics/thong-ke-doanh-thu-giang-vien.xlsx",
        });
    }

    res.status(200).json({ message: "ok", teacher, detailInvoices });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyCourses,
  getMyInfo,
  putMyInfo,
  getMyRevenue,
  getDetailMyCourse,
};
