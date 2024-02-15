const CommentModel = require('../models/courses/comment.model');
const notificationController = require('./notification.controller');
const LessonModel = require('../models/courses/lesson.model');

module.exports = {
    createComment: async (req, res, next) => {
        try {
            const { content, lessonId, commentId } = req.body;
            const { user } = req;

            const lesson = await LessonModel.findById(lessonId).populate({ path: 'chapter', select: 'course name', populate: { path: 'course', select: 'slug name author' } }).select('chapter number title').lean();
            if (!lesson) {
                return res.status(404).json({ message: 'Lesson not found' })
            }
            if (!commentId) {
                await CommentModel.create({ author: user._id, lesson: lessonId, content });
                const notiPayload = {
                    title: `${user.fullName} has commented on ${lesson.chapter.course.name}}`,
                    content: `${content}`,
                    data: {
                        lesson,
                    }
                }
                // create notification for teacher
                await notificationController.createNotification(lesson.chapter.course.author, notiPayload);

            } else {
                const comment = await CommentModel.findOneAndUpdate({ _id: commentId }, { $push: { replies: { author: user._id, lesson: lessonId, content, createdAt: new Date() } } }, { new: true })
                const notiPayload = {
                    title: `${user.fullName} has replied on your comment`,
                    content: `${content}`,
                    data: {
                        lesson,
                    }
                }
                // create notification for author of old comment
                await notificationController.createNotification(comment.author, notiPayload);
            }

            return res.status(201).json({ message: 'Create comment successfully' })
        } catch (error) {
            console.log(error);
            return next(error)
        }
    },

    getComments: async (req, res, next) => {
        try {
            const { lessonId } = req.query;
            const comments = await CommentModel.find({
                lesson: lessonId
            }).populate('author', 'fullName avatar').populate('replies.author', 'fullName avatar');
            return res.status(200).json({ message: 'Get comments successfully', data: comments })
        } catch (error) {
            console.log(error);
            return next(error)
        }
    },

    updateComment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { content, parentCommentId } = req.body;
            const { user } = req;
            const comment = await CommentModel.findById(parentCommentId || id)
            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' })
            }
            if (comment.author.toString() !== user._id.toString()) {
                return res.status(403).json({
                    message: 'You dont have permission to update this comment'
                })
            }
            if (parentCommentId) {
                const index = comment.replies.findIndex(reply => reply._id.toString() === id.toString())
                comment.replies[index].content = content;
                comment.replies[index].createdAt = new Date();
            } else {
                comment.content = content;
            }
            await comment.save();
            return res.status(200).json({ message: 'Update comment successfully' })
        } catch (error) {
            console.log(error);
            return next(error)
        }
    },

    deleteComment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { user } = req;
            const { parentCommentId } = req.body;
            const comment = await CommentModel.findById(parentCommentId || id)
            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' })
            }
            if (comment.author.toString() !== user._id.toString()) {
                return res.status(403).json({
                    message: 'You dont have permission to delete this comment'
                })
            }
            if (parentCommentId) {
                comment.replies = comment.replies.filter(reply => reply._id.toString() !== id.toString())
                await comment.save();
            } else {
                await comment.remove();
            }
            return res.status(200).json({ message: 'Delete comment successfully' })
        } catch (error) {
            console.log(error);
            return next(error)
        }
    }
}