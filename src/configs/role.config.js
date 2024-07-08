const AccessControl = require('accesscontrol');

let grants = {
    admin: {
        account: {
            'create:any': ['*', '!refreshToken'],
            'read:any': ['*', '!refreshToken'],
            'update:any': ['*', '!refreshToken'],
            'delete:any': ['*']
        },
        user: {
            'create:any': ['*'],
            'read:any': ['*'],
            'update:any': ['*', '!account'],
            'delete:any': ['*']
        },
        category: {
            'create:any': ['*', '!slug'],
            'read:any': ['*'],
            'update:any': ['*', '!slug'],
            'delete:any': ['*']
        },
        course: {
            'read:any': ['*'],
            'update:any': ['*', '!slug', '!sellNumber', '!author'],
        },
    },
    teacher: {
        course: {
            'create:own': ['*', '!slug', '!sellNumber', '!author', '!publish'],
            'read:own': ['*'],
            'update:own': ['*', '!slug', '!sellNumber', '!author', '!publish'],
        },
        category: {
            'create:any': ['*', '!slug', '!publish'],
            'read:any': ['*'],
        },
    },
    student: {
        category: {
            'read:any': ['*'],
        },
        course: {
            'read:any': ['*'],
        },
    }
}

// set role permission
const ac = new AccessControl()
ac.grant('student')
    // account
    .updateOwn('account', ['password'])
    // user
    .updateOwn('user')
    // category
    .readAny('category')
    // course
    .readAny('course')
    // my course
    .readOwn('mycourse')

ac.grant('teacher').extend('student')
    .updateOwn('course', ['*', '!author', '!sellNumber', '!slug', '!publish'])
    .createOwn('course', ['*', '!author', '!sellNumber', '!slug', '!publish'])


ac.grant('admin').extend('teacher')
    .updateAny('course', ['*', '!author', '!sellNumber', '!slug'])

module.exports = ac