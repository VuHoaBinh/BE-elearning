const LessonModel = require('../models/courses/lesson.model');
const QuizModel = require('../models/courses/quiz.model');

module.exports = {
  createBulkQuiz: async (req, res, next) => {
    try {
      const { lesson, quizs } = req.body;

      const _lesson = await LessonModel.findById(lesson).lean();
      if (!_lesson) {
        return res.status(400).json({ message: 'Invalid lesson id' });
      }

      const payload = quizs.map((quiz) => {
        return {
          lesson: lesson,
          question: quiz.question,
          answers: quiz.answers,
        }
      })

      await QuizModel.insertMany(payload)
      return res.status(200).json({ message: 'Create quiz successfully' })

    } catch (error) {
      console.log(error);
      return next(error)
    }
  },

  updateQuizById: async (req, res, next) => {
    try {
      const { id } = req.params
      const { question, answers } = req.body
      const quiz = await QuizModel.findById(id)
      if (!quiz) {
        return res.status(400).json({ message: 'Invalid quiz id' })
      }

      const _quiz = await QuizModel.findByIdAndUpdate({ _id: id }, { question, answers }, { new: true })
      return res.status(200).json({ message: 'Update quiz successfully', data: _quiz })
    } catch (error) {
      console.log(error);
      return next(error)
    }
  },

  deleteQuizById: async (req, res, next) => {
    try {
      const { id } = req.params
      const quiz = await QuizModel.findById(id)
      if (!quiz) {
        return res.status(400).json({ message: 'Invalid quiz id' })
      }

      await QuizModel.deleteOne({ _id: id })
      return res.status(200).json({ message: 'Delete quiz successfully' })
    } catch (error) {
      console.log(error);
      return next(error)
    }
  },

  getAllQuizByLessonId: async (req, res, next) => {
    try {
      const { lesson } = req.query
      if (!lesson) {
        return res.status(400).json({ message: 'Lesson id required' })
      }
      const quizs = await QuizModel.find({ lesson }).lean()

      return res.status(200).json({ message: 'ok', data: quizs })
    } catch (error) {
      console.log(error);
      return next(error)
    }
  },

  deleteManyQuizByIds: async (req, res, next) => {
    try {
      const { ids } = req.params

      if (!ids || !ids.length) {
        return res.status(400).json({ message: 'Invalid quiz ids' })
      }
      await QuizModel.deleteMany({ _id: ids })
      return res.status(200).json({ message: 'Delete quiz successfully' })
    } catch (error) {
      console.error('> ERROR::deleteManyQuizByIds::', error);
      return next(error)
    }
  },
};
