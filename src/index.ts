import express from "express";

const PORT = 8080;
const HOSTNAME = "0.0.0.0";

const app = express();

app.get('/', (req, res) => {
  res.json({message: "Hello, world!"})
});

app.get('/error', (req, res) => {
  res.status(500);
  res.send();
});

app.listen(PORT, HOSTNAME, () => console.log(`🚀 App listening on ${HOSTNAME}:${PORT}`));
