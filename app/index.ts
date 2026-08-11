import { configDotenv } from "dotenv";
configDotenv();

import app from "./app.js";
import { prisma } from "./db/config.js";

// connect to the database
prisma
  .$connect()
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });

  
// start the server
app.listen(process.env.BACKEND_PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.BACKEND_PORT || 3000}`);
});
