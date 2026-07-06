import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { seedAdminUser } from "./seeder/seedAdmin.js";
import mainRoutes from "./routes/mainRoutes.js";
import { jsonErrorHandler } from "./middleware/errorhandler.js";
import path from "path";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://192.168.89.51",
      "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/test", function (req, res) {
  return res.json("HI Connection Done");
});

app.use("/", mainRoutes);

app.use("/public", express.static(path.join(process.cwd(), "src/public")));

app.use(jsonErrorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await connectDB();
  await seedAdminUser();
});
