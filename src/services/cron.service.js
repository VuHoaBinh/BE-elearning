var CronJob = require('cron').CronJob;
const CourseModel = require('../models/courses/course.model');
const DetailInvoiceModel = require('../models/detailInvoice.model');
const WebConfigModel = require('../models/webConfig.model');


var jobSetTagCoursesMonthly = new CronJob(
    '0 0 0 1 * *', // 00:00:00 ngày 1 mỗi tháng
    // '* * * * * *',
    async function () {
        try {
            const { numOfTopCourses, numOfSalesOfBestSellerCourses } = await WebConfigModel.findOne({})
            console.log('> Xếp nhãn khoá học vào 00:00:00 ngày 1 mỗi tháng');
            let year = new Date().getFullYear()
            let month = new Date().getMonth()  // 0 - 11
            if (month == 0) {
                month = 12
                year = year - 1
            }
            // lấy các khoá học có số lượng bán cao hơn n mỗi tháng => bestseller
            const bestsellerCourses = await DetailInvoiceModel.aggregate([
                {
                    $project: {
                        courseId: 1,
                        createdAt: 1,
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' },
                    }
                },
                {
                    $match: {
                        month: month,
                        year: year
                    }
                },
                {
                    $group: {
                        _id: { courseId: '$courseId' },
                        count: { $count: {} }
                    }
                },
                {
                    $match: { count: { $gte: numOfSalesOfBestSellerCourses } }
                }
            ])
            // lấy top khoá học có hoá đơn nhiều nhất mỗi tháng => hot
            const hotCourses = await DetailInvoiceModel.aggregate([
                {
                    $project: {
                        courseId: 1,
                        createdAt: 1,
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' },
                    }
                },
                {
                    $match: {
                        month: month,
                        year: year
                    }
                },
                {
                    $group: {
                        _id: { courseId: '$courseId' },
                        count: { $count: {} }
                    }
                },
                {
                    $sort: { 'count': -1 }
                },
                {
                    $limit: numOfTopCourses
                }
            ])
            // xoá nhãn
            await CourseModel.updateMany({}, { type: null })

            // gắn nhãn bestseller
            let ids = bestsellerCourses.map(item => { return item._id.courseId })
            await CourseModel.updateMany({ _id: { $in: ids } }, { type: 'Bestseller' })

            // gắn nhãn hot
            ids = hotCourses.map(item => { return item._id.courseId })
            await CourseModel.updateMany({ _id: { $in: ids } }, { type: 'Hot' })

        } catch (error) {
            console.log('cronjob error >>', error);
        }
    },
    null,
    true,
    'Asia/Ho_Chi_Minh'

);

module.exports = jobSetTagCoursesMonthly