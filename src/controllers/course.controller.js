const CourseModel = require('../models/courses/course.model');
const ChapterModel = require('../models/courses/chapter.model');
const LessonModel = require('../models/courses/lesson.model');
const CommentModel = require('../models/courses/comment.model');
const HistorySearchModel = require('../models/users/historySearch.model');
const HistoryViewModel = require('../models/users/historyView.model');
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
const didYouMean = require('google-did-you-mean')
const helper = require('../helper');
const MyCourseModel = require('../models/users/myCourse.model');
const fs = require('fs');
const UserModel = require('../models/users/user.model');
const mailConfig = require('../configs/mail.config');

const uploadImageToCloudinary = async (req, res, next) => {
    try {
        const image = req.file
        if (image) {
            const url = await helper.uploadImageToCloudinary(image, `${Date.now()}`)
            fs.unlinkSync(image.path);
            return res.status(200).json({ message: 'Upload success', url })
        }
        return res.status(400).json({ message: 'File is required' })
    } catch (error) {
        console.log(error);
        return next(error)
    }
}


//#region  courses

//fn: Thêm khoá học
const postCourse = async (req, res, next) => {
    try {
        const author = req.user
        const account = req.account
        const { thumbnail, name, category, description, lang, intendedLearners, requirements, targets, level, currentPrice, originalPrice, hashtags = [] } = req.body
        // // tags is array
        if (account.role != 'teacher') {
            return res.status(401).json({ message: 'Not permited' })
        }
        // xác thực dữ liệu
        if (currentPrice && parseInt(currentPrice) < 0) {
            return res.status(400).json({ message: 'currentPrice phải lớn hơn hoặc bằng 0' })
        }
        if (originalPrice && parseInt(originalPrice) < 0) {
            return res.status(400).json({ message: 'originalPrice phải lớn hơn hoặc bằng 0' })
        }
        if (originalPrice && currentPrice && parseInt(originalPrice) < parseInt(currentPrice)) {
            return res.status(400).json({ message: 'originalPrice phải lớn hơn hoặc bằng currentPrice' })
        }

        // tính giảm giá
        let saleOff = (1 - parseInt(currentPrice) / parseInt(originalPrice)) * 100 || 0
        // tạo khoá học
        const course = await CourseModel.create(
            { name, category, description, currentPrice, originalPrice, saleOff, author, thumbnail, lang, intendedLearners, requirements, targets, level, hashtags }
        )
        if (course) {
            const chapter = await ChapterModel.create({ course, name: 'Default', number: 1 })
            await LessonModel.create({
                chapter,
                number: 1,
                title: 'Default'
            })
        }
        res.status(201).json({ message: 'ok' })
        try {
            fs.unlinkSync(image.path);
        } catch (error) {

        }
        return
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

//upload Image
const uploadImage = async (req, res, next) => { 
    try {
        var image = null
        try {
            image = req.files['image']
        } catch (error) {
        }
        if (image) {
            let result = await helper.uploadFileToCloudinary(image[0], Date.now())
            return res.status(200).json({ message: "ok", url: result.secure_url })
        } 
        else {
            return res.status(400).json({ message: "image is required" })
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err.message })
    }
}

// fn: Cập nhật khoá học: (thêm markdown cho description)
// Note: không cho phép cập nhật sellNumber, teacher không được phép cập nhật publish
const putCourse = async (req, res, next) => {
    try {
        const user = req.user
        const account = req.account
        const { slug } = req.params
        let newCourse = req.body
        let content = newCourse.content
        delete newCourse.content
        // lấy thông tin hiện tại
        const course = await CourseModel.findOne({ slug }).lean()
        if (!course) return res.status(404).json({ message: 'Course not found!' })

        // kiểm tra quyền
        if (account.role !== 'admin' && JSON.stringify(user._id) !== JSON.stringify(course.author)) {
            return res.status(401).json({ message: 'Not permited' })
        }
        if (newCourse.status == 'pending') {
            if (course.status == 'approved') {
                newCourse.status = 'updating'
            }
        }
        if (newCourse.publish && account.role == 'admin') {
            if (newCourse.publish == true) {
                newCourse.status = 'approved'
            } else {
                if (course.status == 'pending') {
                    newCourse.status = 'denied'
                } else if (course.status == 'updating') {
                    newCourse.status = 'update denied'
                }
            }
        }

        // tránh hacker
        if (newCourse.sellNumber) {
            delete newCourse.sellNumber
        }
        if (account.role != 'admin') {
            delete newCourse.publish
        }

        if (newCourse.currentPrice || newCourse.originalPrice) {
            let cp = newCourse.currentPrice || course.currentPrice
            let op = newCourse.originalPrice || course.originalPrice
            newCourse.saleOff = (1 - parseInt(cp) / parseInt(op)) * 100 || 0
        }

        // cập nhật theo id
        await CourseModel.updateOne({ _id: course._id }, newCourse)
        res.status(200).json({ message: 'ok' })
        // gửi mail thông báo lý do nếu k cho phép

        if (account.role == 'admin' && (newCourse.status == 'denied' || newCourse.status == 'update denied')) {
            let author = await UserModel.findById({ _id: course.author }).populate('account')
            let email = author.account.email
            const mail = {
                to: email,
                subject: 'Từ chối phê duyệt khoá học',
                html: mailConfig.htmlDenyCourse(author, course, content),
            };

            const result = await mailConfig.sendEmail(mail);
            //if success
            if (!result) {
                console.log('gửi mail lỗi');
            }
        }

        // nếu admin duyệt khoá học => set lessons publish = true
        if (account.role == 'admin' && newCourse.status == 'approved') {
            const chapters = await ChapterModel.find({ course: course._id }).lean()
            let objIdsChapters = chapters.map(item => ObjectId(item._id))
            await LessonModel.updateMany({ chapter: { $in: objIdsChapters }, publish: false }, { publish: true })
        }
        try {
            fs.unlinkSync(image.path);
        } catch (error) {
        }
        return
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}


// fn: Lấy tất cả khoá học và phân trang
// ex: ?sort=score&name=api&category=web-development&price=10-50&hashtags=nodejs-mongodb&rating=4.5
const getCourses = async (req, res, next) => {
    try {
        const { user } = req
        let { page = 1, limit = 100, sort, name, category, min, max, hashtags, rating, level, publish, status, author } = req.query
        const nSkip = (parseInt(page) - 1) * parseInt(limit)
        let searchKey = await didYouMean(name) || null
        let aCountQuery = [
            {
                // tính rate trung bình
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $unwind: {
                    'path': '$category',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $project: {
                    'slug': 1,
                    'name': 1,
                    'category._id': 1,
                    'category.name': 1,
                    'category.slug': 1,
                    'thumbnail': 1,
                    'description': 1,
                    'language': 1,
                    'intendedLearners': 1,
                    'requirements': 1,
                    'targets': 1,
                    'level': 1,
                    'currentPrice': 1,
                    'originalPrice': 1,
                    'saleOff': 1,
                    'author._id': 1,
                    'author.fullName': 1,
                    'sellNumber': 1,
                    'hashtags': 1,
                    'type': 1,
                    'rating.rate': 1,
                    'rating.numOfRate': 1,
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'updatedAt': {
                        $dateToString: {
                            date: '$updatedAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'status': 1,
                    //'score': { $meta: 'textScore' },
                }
            },
        ]
        // aggrate query
        let aQuery = [
            {
                // tính rate trung bình
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $unwind: {
                    'path': '$category',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $project: {
                    'slug': 1,
                    'name': 1,
                    'category._id': 1,
                    'category.name': 1,
                    'category.slug': 1,
                    'thumbnail': 1,
                    'description': 1,
                    'language': 1,
                    'intendedLearners': 1,
                    'requirements': 1,
                    'targets': 1,
                    'level': 1,
                    'currentPrice': 1,
                    'originalPrice': 1,
                    'saleOff': 1,
                    'author._id': 1,
                    'author.fullName': 1,
                    'sellNumber': 1,
                    'hashtags': 1,
                    'type': 1,
                    'rating.rate': 1,
                    'rating.numOfRate': 1,
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'updatedAt': {
                        $dateToString: {
                            date: '$updatedAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'status': 1,
                    //'score': { $meta: 'textScore' },
                }
            },
        ]
        // tìm theo tên
        if (name) {
            // nếu người dùng đã đăng nhập thì lưu lịch sử tìm kiếm (chỉ lưu 10 lần gần nhất)
            if (req.user) {
                await HistorySearchModel.findOneAndUpdate(
                    { user: req.user._id },
                    {
                        $push: {
                            historySearchs: {
                                $each: [name],
                                $position: 0,
                                $slice: 10
                            }
                        }
                    },
                    { upsert: true }
                )
            }
            searchKey.original = name
            if (searchKey.suggestion) {
                name = searchKey.suggestion
            }
            aQuery.unshift({
                $match: { $text: { $search: name } }
            })
            aCountQuery.unshift({
                $match: { $text: { $search: name } }
            })
        }
        if (publish) {
            aQuery.splice(1, 0,
                { $match: { publish: publish == 'true' } },
            )
            aCountQuery.splice(1, 0,
                { $match: { publish: publish == 'true' } },
            )
        }
        // tìm theo số đánh giá
        if (rating) {
            aQuery.push({
                $match: { 'rating.rate': { $gte: parseFloat(rating) } }
            })
            aCountQuery.push({
                $match: { 'rating.rate': { $gte: parseFloat(rating) } }
            })
        }
        // tìm theo keyword
        if (hashtags) {
            aQuery.push({
                $match: { hashtags: { $all: hashtags.split('-') } }
            })
            aCountQuery.push({
                $match: { hashtags: { $all: hashtags.split('-') } }
            })
        }
        // tìm theo tác giả
        if (author) {
            aQuery.push(
                {
                    $match: { 'author._id': ObjectId(author) }
                }
            )
            aCountQuery.push({
                $match: { 'author._id': ObjectId(author) }
            })
        }
        // tìm theo category slug
        if (category && category !== 'all') {
            aQuery.push(
                { $match: { 'category.slug': category } }
            )
            aCountQuery.push(
                { $match: { 'category.slug': category } }
            )
        }
        // tìm status
        if (status) {
            aQuery.splice(1, 0,
                { $match: { status: status } }
            )
            aCountQuery.splice(1, 0,
                { $match: { status: status } }
            )
        }
        // tìm theo level
        if (level) {
            aQuery.push(
                { $match: { level: level } }
            )
            aCountQuery.push(
                { $match: { level: level } }
            )
        }
        // tìm theo giá từ min-max
        if (min) {
            min = parseInt(min)
            aQuery.push(
                { $match: { currentPrice: { $gte: min } } }
            )
            aCountQuery.push(
                { $match: { currentPrice: { $gte: min } } }
            )
        }
        if (max) {
            max = parseInt(max)
            aQuery.push(
                { $match: { currentPrice: { $lte: max } } }
            )
            aCountQuery.push(
                { $match: { currentPrice: { $lte: max } } }
            )
        }
        // sắp xếp và thống kê
        if (sort && sort !== 'default') {
            let [f, v] = sort.split('-')
            let sortBy = {}
            if (f == 'score' && name) {
                aQuery.push({ $sort: { score: { $meta: 'textScore' }, rating: -1 } })
            } else if (f == 'rating') {
                sortBy['rating.rate'] = v == 'asc' || v == 1 ? 1 : -1
                aQuery.push({ $sort: sortBy })
            } else {
                sortBy[f] = v == 'asc' || v == 1 ? 1 : -1
                aQuery.push({ $sort: sortBy })
            }
        }

        // nếu user đã login => loại những khoá học đã mua
        if (user) {
            let khoaHocDaMuas = await MyCourseModel.find({ user }).lean()
            let exceptIds = khoaHocDaMuas.map(item => item.course)
            aQuery.splice(1, 0, { $match: { _id: { $nin: exceptIds } } })
            aCountQuery.splice(1, 0, { $match: { _id: { $nin: exceptIds } } })
        }

        if (page && limit) {
            aQuery.push(
                { $skip: nSkip },
                { $limit: parseInt(limit) }
            )
        }

        const courses = await CourseModel.aggregate(aQuery)
        aCountQuery.push({ $count: 'total' })
        const totalCourse = await CourseModel.aggregate(aCountQuery)
        let total = totalCourse[0]?.total || 0

        return res.status(200).json({ message: 'ok', searchKey, total, courses })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: Xem khoá học theo slug
const getCourse = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { user } = req

        const course = await CourseModel.aggregate([
            {
                $match: { slug: slug }
            },
            {   // tính rate trung bình
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} },
                                star5: { $sum: { $cond: [{ $eq: ['$rate', 5] }, 1, 0] } },
                                star4: { $sum: { $cond: [{ $eq: ['$rate', 4] }, 1, 0] } },
                                star3: { $sum: { $cond: [{ $eq: ['$rate', 3] }, 1, 0] } },
                                star2: { $sum: { $cond: [{ $eq: ['$rate', 2] }, 1, 0] } },
                                star1: { $sum: { $cond: [{ $eq: ['$rate', 1] }, 1, 0] } },
                            },
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $lookup: {
                    from: 'chapters',
                    localField: '_id',
                    foreignField: 'course',
                    as: 'chapters'
                }
            },
            {
                $unwind: {
                    path: '$chapters',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'lessons',
                    localField: 'chapters._id',
                    foreignField: 'chapter',
                    as: 'chapters.lessons'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    slug: { $first: '$slug' },
                    category: { $first: '$category' },
                    thumbnail: { $first: '$thumbnail' },
                    description: { $first: '$description' },
                    lang: { $first: '$lang' },
                    intendedLearners: { $first: '$intendedLearners' },
                    requirements: { $first: '$requirements' },
                    targets: { $first: '$targets' },
                    level: { $first: '$level' },
                    currentPrice: { $first: '$currentPrice' },
                    originalPrice: { $first: '$originalPrice' },
                    saleOff: { $first: '$saleOff' },
                    rating: { $first: '$rating' },
                    author: { $first: '$author' },
                    hashtags: { $first: '$hashtags' },
                    sellNumber: { $first: '$sellNumber' },
                    publish: { $first: '$publish' },
                    status: { $first: '$status' },
                    chapters: { $push: '$chapters' },
                    createdAt: { $first: '$createdAt' },
                    type: { $first: '$type' },
                }
            },
            {
                $project: {
                    'slug': 1,
                    'name': 1,
                    'category._id': 1,
                    'category.name': 1,
                    'category.slug': 1,
                    'thumbnail': 1,
                    'description': 1,
                    'lang': 1,
                    'intendedLearners': 1,
                    'requirements': 1,
                    'targets': 1,
                    'level': 1,
                    'currentPrice': 1,
                    'originalPrice': 1,
                    'saleOff': 1,
                    'sellNumber': 1,
                    'rating.rate': 1,
                    'rating.numOfRate': 1,
                    'rating.star5': 1,
                    'rating.star4': 1,
                    'rating.star3': 1,
                    'rating.star2': 1,
                    'rating.star1': 1,
                    'author._id': 1,
                    'author.fullName': 1,
                    'hashtags': 1,
                    'publish': 1,
                    'type': 1,
                    'status': 1,
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'chapters': { _id: 1, number: 1, name: 1, lessons: { _id: 1, number: 1, title: 1, description: 1 } },
                }
            },
        ])
        if (course[0]) {
            if (user) {
                const myCourse = await MyCourseModel.findOne({ user, course: course[0] }).lean()
                if (myCourse) {
                    course[0].isBuyed = true
                }
            }
            if (!course[0].chapters[0].name) { course[0].chapters = [] }
            res.status(200).json({ message: 'ok', course: course[0] })
        } else {
            res.status(404).json({ message: 'mã khoá học không tồn tại' })
        }
        // lưu lịch sử xem
        if (user && course[0]) {
            await HistoryViewModel.findOneAndUpdate(
                { user: req.user._id },
                {
                    $push: {
                        historyViews: {
                            $each: [course[0]._id],
                            $position: 0,
                            $slice: 10
                        }
                    }
                },
                { upsert: true }
            )
        }
        return
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: Xem danh sách khoá học liên quan theo slug (category, hashtags, rating)
const getRelatedCourses = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { page = 1, limit = 12 } = req.query
        const { user } = req
        // course
        const course = await CourseModel.findOne({ slug: slug }).lean()
        if (!course) {
            return res.status(404).json({ message: 'Not found' })
        }
        let query = [
            {
                $match: {
                    category: course.category,
                    _id: { $ne: ObjectId(course._id) },
                    publish: true
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$author' },
            { $unwind: '$category' },
            {
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $sort: { rating: -1 }
            },
            {
                $skip: (parseInt(page) - 1) * parseInt(limit)
            },
            {
                $limit: parseInt(limit)
            }
        ]
        let countQuery = [
            {
                $match: {
                    $and: [
                        { category: course.category },
                        { _id: { $ne: ObjectId(course._id) } },
                        { publish: true },
                    ]
                }
            },
            {
                $count: 'total'
            }
        ]
        if (user) {
            let coursesBuyed = await MyCourseModel.find({ user }).lean()
            let idsCourseBuyed = coursesBuyed.map(item => ObjectId(item.course))
            query.unshift({ $match: { _id: { $nin: idsCourseBuyed } } })
            countQuery.unshift({ $match: { _id: { $nin: idsCourseBuyed } } })
        }

        // tìm khoá học liên quan theo category
        const courses = await CourseModel.aggregate(query)
        const totalCount = await CourseModel.aggregate(countQuery)
        let total = totalCount[0]?.total || 0
        return res.status(200).json({ message: 'ok', total, courses })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}


// fn: gợi ý khoá học 
const getSuggestCourses = async (req, res, next) => {
    try {
        // lấy lịch sử tìm kiếm
        // xem tag nào nhiều nhất => course có tag đó
        const { page, limit } = req.query
        const user = req.user
        let searchKey = {}
        let courses = []
        let total = 0
        let keyword = ''
        let query = [
            {
                // tính rate trung bình
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$author'
            },
            {
                $unwind: {
                    'path': '$category',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $project: {
                    'slug': 1,
                    'name': 1,
                    'category._id': 1,
                    'category.name': 1,
                    'category.slug': 1,
                    'thumbnail': 1,
                    'description': 1,
                    'language': 1,
                    'intendedLearners': 1,
                    'requirements': 1,
                    'targets': 1,
                    'level': 1,
                    'currentPrice': 1,
                    'originalPrice': 1,
                    'saleOff': 1,
                    'author._id': 1,
                    'author.fullName': 1,
                    'sellNumber': 1,
                    'hashtags': 1,
                    'type': 1,
                    'rating.rate': 1,
                    'rating.numOfRate': 1,
                    'createdAt': {
                        $dateToString: {
                            date: '$createdAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'updatedAt': {
                        $dateToString: {
                            date: '$updatedAt',
                            format: '%Y-%m-%dT%H:%M:%S',
                            timezone: 'Asia/Ho_Chi_Minh'
                        }
                    },
                    'status': 1,
                    //'score': { $meta: 'textScore' },
                }
            },
        ]
        let countQuery = JSON.parse(JSON.stringify(query))
        countQuery.push({ $count: 'total' })
        if (page && limit) {
            query.push(
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                { $limit: parseInt(limit) }
            )
        }
        if (user) {
            // nếu có user
            let khoaHocDaMuas = await MyCourseModel.find({ user }).lean()
            let exceptIds = khoaHocDaMuas.map(item => item.course)
            query.unshift({ $match: { _id: { $nin: exceptIds } } })

            // lấy first recent search
            const historySearchOfUser = await HistorySearchModel.findOne({ user: user._id }).lean()
            keyword = historySearchOfUser ? historySearchOfUser.historySearchs[0] : null
            if (keyword) {
                searchKey = await didYouMean(keyword)
                if (searchKey.suggestion) {
                    searchKey.original = keyword
                    keyword = searchKey.suggestion
                }
                query.unshift({
                    $match: { $text: { $search: keyword }, publish: true }
                })
                countQuery.unshift({
                    $match: { $text: { $search: keyword }, publish: true }
                })
                // tìm khoá học liên quan lịch sử tìm kiếm
                courses = await CourseModel.aggregate(query)
                total = (await CourseModel.aggregate(countQuery))[0]?.total || 0
            } else {
                let historyViews = await HistoryViewModel.findOne({ user }).lean()
                let courseId = historyViews?.historyViews[0]
                if (courseId) {
                    let data = await CourseModel.findOne({ _id: courseId }).lean()
                    req.params.slug = data.slug
                    req.user = user
                    courses = await getRelatedCourses(req, res, next)
                    return
                } else {
                    return res.status(200).json({ message: 'ok', courses: [] })
                }
            }
        }
        return res.status(200).json({ message: 'ok', total, keyword, courses })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: Xem danh sách khoá học hot (sellNumber)
// get /hot?category=slug
const getHotCourses = async (req, res, next) => {
    try {
        const { user } = req
        const { page, limit, category } = req.query
        let aQuery = []
        let countQuery = []
        if (category) {
            aQuery.unshift({
                $match: { 'category.slug': category }
            })
            countQuery.unshift({
                $match: { 'category.slug': category }
            })
        }
        countQuery.push(
            { $match: { publish: true, type: { $in: ['Hot', 'Bestseller'] } } },
            {
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$author' },
            { $unwind: '$category' },
            {
                $sort: { sellNumber: -1, rating: -1 }
            },
            { $count: 'total' }
        )
        aQuery.push(
            { $match: { publish: true, type: { $in: ['Hot', 'Bestseller'] } } },
            {
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} }
                            }
                        }
                    ],
                    as: 'rating'
                }
            },
            {
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            {
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$author' },
            { $unwind: '$category' },
            {
                $sort: { sellNumber: -1, rating: -1 }
            },

        )
        if (page && limit) {
            aQuery.push(
                {
                    $skip: (parseInt(page) - 1) * parseInt(limit)
                },
                {
                    $limit: parseInt(limit)
                },
            )
        }
        // nếu user đã login => loại những khoá học đã mua
        if (user) {
            let khoaHocDaMuas = await MyCourseModel.find({ user }).lean()
            let exceptIds = khoaHocDaMuas.map(item => item.course)
            aQuery.unshift({ $match: { _id: { $nin: exceptIds } } })
            countQuery.unshift({ $match: { _id: { $nin: exceptIds } } })
        }
        const courses = await CourseModel.aggregate(aQuery)
        const count = (await CourseModel.aggregate(countQuery))[0]?.total || 0
        return res.status(200).json({ message: 'ok', total: count, courses })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

//fn: xoá khoá học
const deleteCourse = async (req, res, next) => {
    try {
        const { slug } = req.params
        const { account, user } = req

        // kiểm tra khoá học có tồn tại không?
        const course = await CourseModel.findOne({ slug }).lean()
        if (!course) {
            return res.status(400).json({ message: 'Mã khoá học không hợp lệ' })
        }
        if (account.role !== 'admin') {
            if (JSON.stringify(user._id) !== JSON.stringify(course.author)) {
                return res.status(400).json({ message: 'Not permitted' })
            }
        }

        // kiểm tra khoá học có người mua chưa ?
        const isBuyed = await MyCourseModel.findOne({ course: course._id }).lean()
        if (isBuyed) {
            return res.status(400).json({ message: 'Khoá học đã có người mua. Không thể xoá' })
        }

        // xoá khoá học
        await CourseModel.deleteOne({ slug: slug })
        res.status(200).json({ message: 'delete ok' })

        let chapters = await ChapterModel.find({ course: course._id }).select('_id').lean()
        chapters = chapters.map(obj => obj._id)
        // xoá chapters và lesson của từng chapter
        await LessonModel.deleteMany({ chapter: { $in: chapters } })
        await ChapterModel.deleteMany({ course: course._id })
        return
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}


//fn: xem khoá học để kiểm duyệt (có cả nội dung bài giảng)
const getDetailPendingCourse = async (req, res, next) => {
    try {
        const { slug } = req.params

        const course = await CourseModel.aggregate([
            {
                $match: { slug: slug }
            },
            {   // tính rate trung bình
                $lookup: {
                    from: 'rates',
                    localField: '_id',
                    foreignField: 'course',
                    pipeline: [
                        {
                            $group: {
                                _id: '$course',
                                rate: { $avg: '$rate' },
                                numOfRate: { $count: {} },
                                star5: { $sum: { $cond: [{ $eq: ['$rate', 5] }, 1, 0] } },
                                star4: { $sum: { $cond: [{ $eq: ['$rate', 4] }, 1, 0] } },
                                star3: { $sum: { $cond: [{ $eq: ['$rate', 3] }, 1, 0] } },
                                star2: { $sum: { $cond: [{ $eq: ['$rate', 2] }, 1, 0] } },
                                star1: { $sum: { $cond: [{ $eq: ['$rate', 1] }, 1, 0] } },
                            },
                        }
                    ],
                    as: 'rating'
                }
            },
            { // unwind rating
                $unwind: {
                    'path': '$rating',
                    'preserveNullAndEmptyArrays': true
                }
            },
            { // lookup user
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { // unwind author
                $unwind: '$author'
            },
            { // lookup categorys
                $lookup: {
                    from: 'categorys',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { // unwind category
                $unwind: '$category'
            },
            { // lookup chapters
                $lookup: {
                    from: 'chapters',
                    localField: '_id',
                    foreignField: 'course',
                    as: 'chapters'
                }
            },
            {
                $unwind: {
                    path: '$chapters',
                    preserveNullAndEmptyArrays: true
                }
            },
            { // lookup lessons
                $lookup: {
                    from: 'lessons',
                    localField: 'chapters._id',
                    foreignField: 'chapter',
                    as: 'chapters.lessons'
                }
            },
            { // group
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    slug: { $first: '$slug' },
                    category: { $first: '$category' },
                    thumbnail: { $first: '$thumbnail' },
                    description: { $first: '$description' },
                    lang: { $first: '$lang' },
                    intendedLearners: { $first: '$intendedLearners' },
                    requirements: { $first: '$requirements' },
                    targets: { $first: '$targets' },
                    level: { $first: '$level' },
                    currentPrice: { $first: '$currentPrice' },
                    originalPrice: { $first: '$originalPrice' },
                    saleOff: { $first: '$saleOff' },
                    rating: { $first: '$rating' },
                    author: { $first: '$author' },
                    hashtags: { $first: '$hashtags' },
                    publish: { $first: '$publish' },
                    status: { $first: '$status' },
                    chapters: { $push: '$chapters' },
                }
            },
            {
                $project: {
                    'slug': 1,
                    'name': 1,
                    'category._id': 1,
                    'category.name': 1,
                    'category.slug': 1,
                    'thumbnail': 1,
                    'description': 1,
                    'lang': 1,
                    'intendedLearners': 1,
                    'requirements': 1,
                    'targets': 1,
                    'level': 1,
                    'currentPrice': 1,
                    'originalPrice': 1,
                    'saleOff': 1,
                    'sellNumber': 1,
                    'rating.rate': 1,
                    'rating.numOfRate': 1,
                    'rating.star5': 1,
                    'rating.star4': 1,
                    'rating.star3': 1,
                    'rating.star2': 1,
                    'rating.star1': 1,
                    'author._id': 1,
                    'author.fullName': 1,
                    'hashtags': 1,
                    'publish': 1,
                    'status': 1,
                    'chapters': 1,
                }
            }
        ])
        if (course[0]) {
            if (!course[0].chapters[0].name) { course[0].chapters = [] }
            return res.status(200).json({ message: 'ok', course: course[0] })
        }

        return res.status(404).json({ message: 'không tìm thấy' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error })
    }
}
//#endregion

module.exports = {
    uploadImageToCloudinary,
    postCourse,
    getCourses,
    putCourse,
    getCourse,
    getRelatedCourses,
    getHotCourses,
    getSuggestCourses,
    deleteCourse,
    getDetailPendingCourse,
    uploadImage
}