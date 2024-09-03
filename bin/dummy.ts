/**
 * if you want to not track changes to this file,
 * run `git update-index --assume-unchanged bin/dummy.ts`
 */
import prisma from '../src/prisma';
const main = async () => {
    const users = await prisma.user.findMany();
    console.log(users);
};

main().catch((err) => console.error(err));
