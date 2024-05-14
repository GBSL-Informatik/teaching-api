import express from "express";
import {PrismaClient} from "@prisma/client";

const PORT = 8080;
const HOSTNAME = "0.0.0.0";

const app = express();
const prisma = new PrismaClient();

app.get('/', async (req, res) => {
  // res.json({message: "Hello, world!"})
});

prisma.messages.findMany().then((res: any) => console.log(res));

app.listen(PORT, HOSTNAME, () => console.log(`🚀 App listening on ${HOSTNAME}:${PORT}`));
