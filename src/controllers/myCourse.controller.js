const MyCourseModel = require('../models/users/myCourse.model')
const CourseModel = require('../models/courses/course.model')
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
const _ = require('lodash')
const LessonModel = require('../models/courses/lesson.model')
const ChapterModel = require('../models/courses/chapter.model')

// fn: lấy danh sách khoá học đã mua và phân trang
const getMyCourses = async (req, res, next) => {
  try {
    const { page, limit, name, sort } = req.query
    const { user } = req
    let query = [
      { $match: { user: ObjectId(user._id) } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $unwind: {
          path: '$course',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'course.author',
          foreignField: '_id',
          as: 'course.author',
        },
      },
      { $unwind: '$course.author' },
      {
        $lookup: {
          from: 'chapters',
          localField: 'course._id',
          foreignField: 'course',
          as: 'chapters',
        },
      },
      {
        $unwind: {
          path: '$chapters',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'lessons',
          localField: 'chapters._id',
          foreignField: 'chapter',
          as: 'chapters.lessons',
        },
      },
      {
        $group: {
          _id: '$_id',
          course: { $first: '$course' },
          chapters: { $push: '$chapters' },
          progress: { $first: '$progress' },
          createdAt: { $first: '$createdAt' },
        },
      },
      {
        $project: {
          _id: 1,
          course: {
            _id: 1,
            name: 1,
            thumbnail: 1,
            slug: 1,
            author: { _id: 1, fullName: 1 },
            description: 1,
          },
          chapters: {
            _id: 1,
            name: 1,
            lessons: {
              _id: 1,
              number: 1,
              title: 1,
              type: 1,
              video: 1,
              text: 1,
              slide: 1,
              description: 1,
              duration: 1,
            },
          },
          progress: 1,
          createdAt: 1,
        },
      },
    ]
    let countQuery = [
      { $match: { user: ObjectId(user._id) } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $unwind: {
          path: '$course',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'course.author',
          foreignField: '_id',
          as: 'course.author',
        },
      },
      { $unwind: '$course.author' },
      {
        $lookup: {
          from: 'chapters',
          localField: 'course._id',
          foreignField: 'course',
          as: 'chapters',
        },
      },
      {
        $unwind: {
          path: '$chapters',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'lessons',
          localField: 'chapters._id',
          foreignField: 'chapter',
          as: 'chapters.lessons',
        },
      },
      {
        $group: {
          _id: '$_id',
          course: { $first: '$course' },
          chapters: { $push: '$chapters' },
          progress: { $first: '$progress' },
        },
      },
      {
        $project: {
          _id: 1,
          course: {
            _id: 1,
            name: 1,
            thumbnail: 1,
            slug: 1,
            author: { _id: 1, fullName: 1 },
            description: 1,
          },
          chapters: {
            _id: 1,
            name: 1,
            lessons: {
              _id: 1,
              number: 1,
              title: 1,
              type: 1,
              video: 1,
              text: 1,
              slide: 1,
              description: 1,
              duration: 1,
            },
          },
          progress: 1,
        },
      },
    ]
    if (name) {
      query.push({ $match: { 'course.name': new RegExp(name, 'img') } })
      countQuery.push({ $match: { 'course.name': new RegExp(name, 'img') } })
    }
    // ?sort=createdAt-asc || ?sort=progress-asc
    if (sort) {
      let sortBy = {}
      let [f, v] = sort.split('-')
      sortBy[f] = v == 'asc' || v == '1' ? 1 : -1
      sortBy = { ...sortBy, _id: -1 }
      query.push({ $sort: sortBy })
    }
    if (page && limit) {
      query.push({ $skip: (parseInt(page) - 1) * parseInt(limit) }, { $limit: parseInt(limit) })
    }

    const myCourses = await MyCourseModel.aggregate(query)
    countQuery.push({ $count: 'total' })
    const count = await MyCourseModel.aggregate(countQuery)
    let total = count[0]?.total || 0

    // tính phần trăm hoàn thành khoá học và hiện đánh giá nếu có
    var result = myCourses.map((item) => {
      // tính tiến độ % hoàn thành khoá học
      let tu = 0
      item.progress.forEach((i) => {
        i.complete ? tu++ : (tu += 0)
      })
      let mau = 0
      item.chapters.forEach((chapter) => {
        mau += chapter.lessons.length
      })
      delete item.progress
      delete item.chapters
      item.percentProgress = (tu * 100) / mau || 0
      return item
    })
    // sort theo phần trăm tiến trình
    if (sort) {
      let [field, value] = sort.split('-')
      if (field == 'progress') {
        result = _.orderBy(result, 'percentProgress', value)
      }
    }

    res.status(200).json({ message: 'ok', total, myCourses: result })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: lấy chi tiết các bài giảng khoá học đã mua
const getMyCourse = async (req, res, next) => {
  try {
    const { id } = req.params
    const { user } = req
    let query = [
      { $match: { _id: ObjectId(id), user: ObjectId(user._id) } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $lookup: {
          from: 'users',
          localField: 'course.author',
          foreignField: '_id',
          as: 'course.author',
        },
      },
      { $unwind: '$course.author' },
      {
        $lookup: {
          from: 'chapters',
          localField: 'course._id',
          foreignField: 'course',
          as: 'chapters',
        },
      },
      {
        $unwind: {
          path: '$chapters',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // lấy những lesson publish = true
        $lookup: {
          from: 'lessons',
          localField: 'chapters._id',
          foreignField: 'chapter',
          let: {},
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$publish', true],
                },
              },
            },
            { $sort: { number: 1 } },
          ],
          as: 'chapters.lessons',
        },
      },
      {
        $group: {
          _id: '$_id',
          course: { $first: '$course' },
          chapters: { $push: '$chapters' },
          progress: { $first: '$progress' },
          lastView: { $first: '$lastView' },
        },
      },
      {
        $project: {
          _id: 1,
          course: {
            _id: 1,
            name: 1,
            thumbnail: 1,
            slug: 1,
            author: { _id: 1, fullName: 1 },
            description: 1,
          },
          chapters: {
            _id: 1,
            name: 1,
            number: 1,
            lessons: {
              _id: 1,
              chapter: 1,
              number: 1,
              title: 1,
              type: 1,
              video: 1,
              text: 1,
              slide: 1,
              description: 1,
              duration: 1,
            },
          },
          progress: 1,
          lastView: 1,
        },
      },
    ]

    const myCourse = await MyCourseModel.aggregate(query)
    // tính phần trăm hoàn thành khoá học và chèn timeline vào lesson
    var result = myCourse.map((item) => {
      let tu = 0
      item.progress.forEach((i) => {
        i.complete ? tu++ : (tu += 0)
      })
      let mau = 0
      try {
        item.chapters.forEach((chapter) => {
          mau += chapter.lessons.length
          // điền timeline và complete vào lesson
          chapter.lessons.map((lesson) => {
            lesson.complete = false
            lesson.timeline = 0
            for (let i = 0; i < item.progress.length; i++) {
              const element = item.progress[i]
              if (JSON.stringify(element.lessonId) == JSON.stringify(lesson._id)) {
                lesson.complete = element.complete
                lesson.timeline = element.timeline
                break
              }
            }
            return lesson
          })
        })
      } catch (error) {
        console.log(error)
        return res.status(500).json({ message: 'Khoá học chưa có bài giảng' })
      }

      item.percentProgress = (tu * 100) / mau || 0
      delete item.progress
      return item
    })

    try {
      var lastView = null
      if (myCourse[0].lastView) {
        lastView = await LessonModel.findById(myCourse[0].lastView)
      } else {
        lastView = result[0].chapters[0].lessons[0]
      }
      const chapterOfLastView = await ChapterModel.findById(lastView.chapter).lean()

      result[0].lastView = lastView
      result[0].chapterOfLastView = chapterOfLastView
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: 'Khoá học chưa có bài giảng' })
    }

    res.status(200).json({ message: 'ok', myCourse: result[0] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// fn: cập nhật tiến trình cho từng bài giảng trong khoá học
const putProgress = async (req, res, next) => {
  try {
    const { id } = req.params
    var { lessonId, timeline, complete } = req.body
    const dataUpdate = { 'progress.$.timeline': parseInt(timeline) }

    const mc = await MyCourseModel.findById(id).lean()
    const lesson = await LessonModel.findById(lessonId).lean()
    if (lesson) {
      let isExisted =
        mc.progress?.some((item) => JSON.stringify(item.lessonId) == JSON.stringify(lessonId)) ||
        false
      if (parseInt(lesson.duration) * 0.9 <= parseInt(timeline)) {
        dataUpdate['progress.$.complete'] = true
      }
      if (parseInt(lesson.duration) < parseInt(timeline)) {
        dataUpdate['progress.$.timeline'] = parseInt(lesson.duration)
      }
      if (isExisted) {
        await MyCourseModel.updateOne(
          { _id: id, 'progress.lessonId': lessonId },
          { $set: dataUpdate }
          // { $set: { 'progress.$.timeline': parseInt(timeline) } }
        )
      } else {
        if (parseInt(lesson.duration) * 0.9 <= parseInt(timeline)) {
          complete = 'true'
        }
        if (parseInt(lesson.duration) < parseInt(timeline)) {
          complete = 'true'
          timeline = parseInt(lesson.duration)
        }
        await MyCourseModel.updateOne(
          { _id: id },
          {
            $push: {
              progress: { lessonId, timeline: parseInt(timeline), complete: complete == 'true' },
            },
          }
        )
      }
      // cập nhật last view
      await MyCourseModel.updateOne({ _id: id }, { lastView: lessonId })
    } else {
      return res.status(404).json({ message: 'Not found' })
    }
    res.status(200).json({ message: 'update oke' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

const postMyCourse = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.body.course).lean()

    if (!course) {
      return res.status(404).json({ message: 'Not found' })
    }

    const isExisted = await MyCourseModel.findOne({ user: req.user, course: course._id }).lean()

    if (isExisted) {
      return res.status(400).json({ message: 'Đã đăng ký vui lòng chờ đợi' })
    }

    const myCourse = await MyCourseModel.create({ course, user: req.user })
    res.status(201).json({ message: 'ok', myCourse })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getMyCourses,
  getMyCourse,
  putProgress,
  postMyCourse,
}
