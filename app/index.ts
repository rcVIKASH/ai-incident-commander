import express, { Request, Response } from "express";
import { configDotenv } from "dotenv";

configDotenv();

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.listen(process.env.BACKEND_PORT || 3000, () => {
  console.log(
    `Server is running on port ${process.env.BACKEND_PORT || 3000}`
  );
});