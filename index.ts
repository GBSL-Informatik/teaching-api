import express from "express";

const PORT = 8080;
const HOSTNAME = "0.0.0.0";

const app = express();

app.listen(PORT, HOSTNAME, () => console.log(`🚀 App listening on ${HOSTNAME}:${PORT}`));
