const LessonModel = require('../models/courses/lesson.model');
const helper = require('../helper');
const UserModel = require('../models/users/user.model');
const AccountModel = require('../models/users/account.model');
const ChapterModel = require('../models/courses/chapter.model');
const CourseModel = require('../models/courses/course.model');
var fs = require('fs');
const QuizModel = require('../models/courses/quiz.model');


const uploadFileToCloudinary = async (req, res, next) => {
    try {
        const { file } = req
        if (file) {
            const { url } = await helper.uploadFileToCloudinary(file, `${Date.now()}`)
            fs.unlinkSync(file.path);
            return res.status(200).json({ message: 'Upload success', url })
        }
        return res.status(400).json({ message: 'File is required' })
    } catch (error) {
        console.log(error);
        return next(error)
    }
}

const uploadVideoToCloudinary = async (req, res, next) => {
    try {
        const { file } = req
        const { lesson_id } = req.body
        if (file) {
            const lesson = await LessonModel.findById(lesson_id)
            if (!lesson) {
                return res.status(400).json({ message: 'Lesson not found' })
            }
            const public_id = Date.now()
            let videoInfo = {
                name: file.originalname,
                size: (file.size / 1000000).toFixed(2) + " mb",
                createdAt: new Date(),
                status: "processing",
                type: file.mimetype
            }
            const video = [
                `https://res.cloudinary.com/dtbazi1zt/video/upload/sp_hd/videos/${lesson_id}-${public_id}.m3u8`,
                `https://res.cloudinary.com/dtbazi1zt/video/upload/videos/${lesson_id}-${public_id}.mp4`
            ]
            res.status(200).json({ videoInfo, video })
            const result = await helper.uploadVideoToCloudinary(file, lesson_id, public_id)
            fs.unlinkSync(file.path);
            if (result.error) {
                console.log(`> Upload video fail:`, public_id, '|||', result);
                // throw new Error('Upload video fail')
            }
            // update lesson id
            videoInfo.status = "success"
            lesson.videoInfo = videoInfo
            await lesson.save()
            console.log(`> Process video success:`, lesson_id);
            return
        }
        return res.status(400).json({ message: 'File is required' })
    } catch (error) {
        console.log('> Upload video fail:', error);
        return next(error)
    }
}

// fn: cho phép thao tác (chỉ author)
const isPermitted = async (req, res, next) => {
    try {
        const { user, account } = req
        const { id, chapter } = req.params
        if (chapter) {
            var ct = await ChapterModel.findById(chapter).lean()
        } else {
            const lesson = await LessonModel.findById(id).lean()
            req.lesson = lesson
            var ct = await ChapterModel.findById(lesson.chapter).lean()
        }
        const c = await CourseModel.findById(ct.course).lean()
        if (JSON.stringify(c.author) !== JSON.stringify(user._id)) {
            return res.status(401).json({ message: 'Unauthorize', error: error.message })
        }
        next()
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: 'Unauthorize', error: error.message })
    }
}


// fn: tạo mới lesson
const postLesson = async (req, res, next) => {
    try {
        var { chapter, number, title, description } = req.body
        number = parseInt(number)
        const objChapter = await ChapterModel.findById(chapter).lean()
        if (!objChapter) return res.status(400).json({ message: 'Chapter not found' })
        // check lesson nào có number = number hay không? dời toàn bộ lesson có number > number
        const currentLesson = await LessonModel.findOne({ chapter, number })
        if (currentLesson) {
            await LessonModel.updateMany(
                { chapter, number: { $gte: number } },
                { $inc: { number: 1 } }
            )
        } else {
            const latestLesson = (await LessonModel.find({ chapter }).sort({ number: -1 }))[0]
            number = latestLesson?.number + 1 || 0
        }

        await LessonModel.create({ chapter, number, title, description })
        res.status(201).json({ message: 'create ok' })
        const objCourse = await CourseModel.findById(objChapter.course).lean()
        if (objCourse.status == 'approved') {
            await CourseModel.updateOne({ _id: objCourse._id }, { status: 'updating' })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message, error: error.message })
    }
}

// fn: cập nhật lesson
const putLessonTypeVideo = async (req, res, next) => {
    try {
        const { id } = req.params
        var { number, title, description, type, text, video, videoInfo } = req.body;
        number = parseInt(number)
        const { lesson } = req
        if (number) {
            let start, end, step
            if (number < lesson.number) {
                start = number - 1
                end = lesson.number
                step = 1
            } else {
                start = lesson.number
                end = number + 1
                step = -1
            }
            // cập nhật number các lesson khác.
            await LessonModel.updateMany({
                chapter: lesson.chapter,
                number: {
                    $gt: start,
                    $lt: end,
                }
            }, { $inc: { number: step } })
        }
        let payload = { ...req.body, publish: false }
        switch (type) {
            case 'video':
                payload.text = null
                payload.slide = null
                break;
            case 'text':
                payload.video = []
                payload.videoInfo = {}
                payload.slide = null
                break;
            case 'quiz':
                payload.video = []
                payload.videoInfo = {}
                payload.slide = null
                payload.text = null
                break;
            case 'slide':
                payload.video = []
                payload.videoInfo = {}
                payload.text = null
                break;
            default:
                break;
        }
        // cập nhật lesson
        const result = await LessonModel.findOneAndUpdate({ _id: id }, payload, { new: true })
        return res.status(200).json({ message: 'updating oke', result })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message, error: error.message })
    }
}

// fn: lấy detail lesson
const getLesson = async (req, res, next) => {
    try {
        const { id } = req.params

        const lesson = await LessonModel.findById(id).lean()
        if (lesson.type == 'quiz') {
            lesson.quizs = await QuizModel.find({ lesson: id }).lean()
        }

        lesson ? message = 'ok' : message = 'Invalid id'

        res.status(200).json({ message, lesson })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message, })
    }
}

//fn: lấy lesson trong 1 chương bằng chapter id 
const getLessons = async (req, res, next) => {
    try {
        const { chapter } = req.query
        const lessons = await LessonModel.find({ chapter }).sort([['number', 1]]).lean()

        lessons ? message = 'ok' : message = 'Chapter id required'

        res.status(200).json({ message, lessons })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message, })
    }
}



// fn: delete lesson (vẫn chưa xoá tài nguyên trên cloudinary)
const deleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params
        const lesson = await LessonModel.findById(id).lean()

        // update number của các lesson có number > lesson.number
        await LessonModel.updateMany(
            { chapter: lesson.chapter, number: { $gt: lesson.number } },
            { $inc: { number: -1 } }
        )
        lesson ? message = 'delete ok' : message = 'Invalid id'

        res.status(200).json({ message })

        await LessonModel.deleteOne({ _id: id })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message, error: error.message })
    }
}


module.exports = {
    isPermitted,
    postLesson,
    putLessonTypeVideo,
    getLesson,
    getLessons,
    deleteLesson,
    uploadFileToCloudinary,
    uploadVideoToCloudinary
}