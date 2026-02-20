import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { initAuth } from "./config/auth";
import routes from "./routes/routes";

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    const db     = mongoose.connection.db!;
    const client = mongoose.connection.getClient();
    const auth   = initAuth(db, client);

    const authHandler = toNodeHandler(auth);
    app.use(routes);
    app.use("/api/auth", (req, res) => authHandler(req, res));

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
