import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import TrainerRoutes from "./Routes/TrainerRoutes.js";
import ClientRoutes from "./Routes/ClientRoutes.js"
import path from 'path'
import { fileURLToPath } from 'url'; // Required for __dirname in ES modules

// Setup __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



dotenv.config({
    path: "./config/config.env",
});

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH','HEAD'],
    credentials: true,
}



    const app = express();
    app.use(express.json());
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(cors(corsOptions))
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    app.use('/api/auth',TrainerRoutes );
    app.use("/api/",ClientRoutes);

app.get("/", (req, res) => {
    res.send("Server is working");
  });
  
  
  
  
  export default app;