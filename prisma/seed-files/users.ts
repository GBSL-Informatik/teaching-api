import { Prisma } from "@prisma/client"


const { USER_EMAIL, USER_ID } = process.env;

const users = [
    {
        email: 'foo@bar.ch',
        id: '96651c13-3af6-4cc0-b242-ea38d438dc41'
    },
    {
        email: 'test@user.ch',
        id: '4b6d8b5d-3b6c-4c8b-8d3c-6f2c3f6e2b4b'
    }
] satisfies Prisma.UserCreateInput[];

if (USER_EMAIL && USER_ID) {
    users.push({
        email: USER_EMAIL,
        id: USER_ID
    })
}

export { users };