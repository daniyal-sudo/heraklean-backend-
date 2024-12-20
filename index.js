import app from "./App.js";
import dotenv from "dotenv";
import { connectDB } from "./Config/database.js";

dotenv.config(); // Load environment variables from config.env




// Connect to the database first, then start the server
connectDB().then(() => {
  app.listen('5001', () => {
    console.log(`Server is running on port: 5001`);
  });
}).catch((error) => {
  console.error("Failed to connect to the database", error);
  process.exit(1); // Exit the process if the database connection fails
});
