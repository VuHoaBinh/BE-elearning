const ExamModel = require('../models/courses/exam.model');
const LessonModel = require('../models/courses/lesson.model');
const QuizModel = require('../models/courses/quiz.model');


module.exports = {
    postExam: async (req, res, next) => {
        try {
            const { user } = req;
            const { lesson, exams } = req.body;
            const exam = await ExamModel.findOne({ user, lesson }).lean();
            if (exam) {
                return res.status(400).json({ message: 'You have already done this exam' });
            }
            const quiz = JSON.parse(JSON.stringify(await QuizModel.find({ lesson }).lean()))

            let scores = 0;
            const answered = []
            for (const item of exams) {
                const { answeredIds, quizId } = item;
                const quiz = await QuizModel.findById(quizId).lean();
                if (!quiz) {
                    return
                }
                const question = quiz.question
                const answers = quiz.answers.map((answer) => {
                    answer = JSON.parse(JSON.stringify(answer));
                    if (answeredIds.includes(answer._id)) {
                        answer.isChosen = true;
                    if (answer.isCorrect) {
                        scores += 1;
                    }
                    } else {
                        answer.isChosen = false;
                    }
                    return answer;
                });
                answered.push({ _id: quiz._id, question, answers })
            }

            // check if submit exam missing answer
            if (exams.length != quiz.length) {
                const quizIds = exams.map(item => item.quizId)
                const missingQuiz = quiz.filter(item => !quizIds.includes(item._id.toString()))
                missingQuiz.map(quiz => {
                    const answers = quiz.answers.map((answer) => {
                        answer.isChosen = false;
                        return answer;
                    })
                    answered.push({ _id: quiz._id, question: quiz.question, answers })
                })
            }

            const data = await ExamModel.create({ user, lesson, scores, maxScores: quiz.length, answered });

            return res.status(200).json({ message: 'Success', data });
        } catch (error) {
            console.log(error);
            return next(error);
        }
    },

    getExamByLessonAndUserId: async (req, res, next) => {
        try {
            const { user } = req;
            const { lesson } = req.query;
            if (!lesson) return res.status(400).json({ message: 'lesson is required' })

            const data = await ExamModel.findOne({ user, lesson }).lean();
            return res.status(200).json({ message: 'Success', data });
        } catch {
            console.log(error);
            return next(error);
        }
    },

}