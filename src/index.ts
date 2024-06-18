import express from "express";
import {PrismaClient} from "@prisma/client";
import path from "path";

const PORT = 3000;
const HOSTNAME = "127.0.0.1";

const app = express();
const prisma = new PrismaClient();

app.use(express.static(path.join(__dirname,'..', 'docs')));

app.get('/', async (req, res) => {
    res.json({message: "Hello, world!"})
});

// prisma.messages.findMany().then((res: any) => console.log(res));

app.listen(PORT, HOSTNAME, () => console.log(`🚀 App listening on ${HOSTNAME}:${PORT}`));
