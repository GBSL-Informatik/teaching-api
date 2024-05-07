import express from "express";

const PORT = 8080;
const HOSTNAME = "0.0.0.0";
const DB_HOSTNAME = "127.0.0.1";
const DB_PORT = 5432;
const DB_NAME = "teaching_website";
const DB_USERNAME = "teaching_website_backend";
const DB_PASSWORD = "zW4SMEXLHpXXxxk";

const app = express();

app.get('/', (req, res) => {
  res.json({message: "Hello, world!"})
});

app.listen(PORT, HOSTNAME, () => console.log(`🚀 App listening on ${HOSTNAME}:${PORT}`));
