const ChapterModel = require('../models/courses/chapter.model');
const LessonModel = require('../models/courses/lesson.model');
const CourseModel = require('../models/courses/course.model');
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;


// fn: xác thực
const isPermitted = async (req, res, next) => {
    try {
        const { id } = req.params
        const { user } = req
        const chapter = await ChapterModel.findById(id).lean()
        if (!chapter) {
            return res.status(400).json({ message: 'Invalid id' })
        }
        const course = await CourseModel.findOne({ _id: chapter.course }).lean()
        // kiểm tra user có phải là author không
        if (JSON.stringify(user._id) === JSON.stringify(course.author)) {
            req.chapter = chapter
            return next()
        }
        return res.status(403).json({ message: 'Not permitted' })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: tạo chapter mới
const postChapter = async (req, res, next) => {
    try {
        var { course, name, number } = req.body
        const { user } = req
        const c = await CourseModel.findById(course).lean()
        if (JSON.stringify(user._id) !== JSON.stringify(c.author)) {
            return res.status(403).json({ message: 'Not permitted' })
        }
        number = parseInt(number)
        // check chapter nào có number = number hay không? dời toàn bộ chapter có number > number
        const currentChapter = await ChapterModel.findOne({ course, number })
        if (currentChapter) {
            await ChapterModel.updateMany(
                { course, number: { $gte: number } },
                { $inc: { number: 1 } }
            )
        } else {
            const latestChapter = (await ChapterModel.find({ course }).sort({ number: -1 }))[0]
            number = latestChapter?.number + 1 || 0
        }
        await ChapterModel.create({ number, course, name })
        return res.status(201).json({ message: 'ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: lấy danh sách chapter bằng mã khoá học (course id)
const getChapters = async (req, res, next) => {
    try {
        const { lesson = 'true', course } = req.query
        let query = []
        if (course) {
            query.unshift({
                $match: { course: ObjectId(course) }
            })
        }
        if (JSON.stringify(lesson) === JSON.stringify('true')) {
            query.push({
                $lookup: {
                    from: 'lessons',
                    let: { chapterId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$chapter', '$$chapterId']
                                }
                            }
                        },
                        { $sort: { number: 1 } }
                    ],
                    as: 'lessons'
                }
            })
        }
        query.push({
            $sort: { number: 1 }
        })
        const chapters = await ChapterModel.aggregate(query)
        return res.status(200).json({ message: 'ok', chapters })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: cập nhật chapter by id
const putChapter = async (req, res, next) => {
    try {
        const { id } = req.params
        const data = Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v != null));
        var { number } = data
        number = parseInt(number)
        const { chapter } = req
        if (number) {
            let start, end, step
            if (number < chapter.number) {
                start = number - 1
                end = chapter.number
                step = 1
            } else {
                start = chapter.number
                end = number + 1
                step = -1
            }
            // cập nhật number các chapter khác.
            await ChapterModel.updateMany({
                course: chapter.course,
                number: {
                    $gt: start,
                    $lt: end,
                }
            }, { $inc: { number: step } })
        }

        await ChapterModel.updateOne({ _id: id }, data)
        return res.status(200).json({ message: ' update ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}

// fn: xoá chapter by id
const deleteChapter = async (req, res, next) => {
    try {
        const { id } = req.params

        const chapter = await ChapterModel.findById(id).lean()
        await ChapterModel.updateMany(
            { course: chapter.course, number: { $gt: chapter.number } },
            { $inc: { number: -1 } }
        )

        // xoá chapter
        await ChapterModel.deleteOne({ _id: id })
        // xoá lesson liên quan
        await LessonModel.deleteMany({ chapter: id })
        return res.status(200).json({ message: 'delete ok' })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message })
    }
}


module.exports = {
    postChapter,
    getChapters,
    putChapter,
    deleteChapter,
    isPermitted
}


