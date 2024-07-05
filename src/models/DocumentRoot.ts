import prisma from '../prisma';
import {PrismaClient} from "@prisma/client";

function DocumentRoot(db: PrismaClient['documentRoot']) {
    return Object.assign(db, {

        async findModel(id: string) {
            return db.findUnique({
                where: {
                    id: id,
                },
            });
        },
    });
}

export default DocumentRoot(prisma.documentRoot);
