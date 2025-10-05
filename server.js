import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import { Pool } from "pg";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// ====================== CẤU HÌNH CƠ BẢN ======================
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ====================== CẤU HÌNH KẾT NỐI POSTGRESQL ======================
const isRender = !!process.env.DATABASE_URL;

const pool = new Pool(
  isRender
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: "postgres",
        host: "localhost",
        database: "postgres",
        password: "kIMPHU@290105.",
        port: 5432,
        ssl: false,
      }
);

// ====================== CẤU HÌNH CLOUDINARY ======================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "YOUR_CLOUD_NAME",
  api_key: process.env.CLOUDINARY_API_KEY || "YOUR_API_KEY",
  api_secret: process.env.CLOUDINARY_API_SECRET || "YOUR_API_SECRET",
});

// ====================== CẤU HÌNH MULTER STORAGE (CLOUDINARY) ======================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "submissions", // Tên folder trong Cloudinary
    resource_type: "auto", // Cho phép pdf, zip, ảnh, ...
  },
});
const upload = multer({ storage });

// ====================== ROUTES ======================

// Test route
app.get("/", (req, res) => {
  res.send("✅ Backend đang chạy ổn định với Cloudinary 🚀");
});

// ==== API POST /submit ====
app.post("/submit", upload.single("file"), async (req, res) => {
  try {
    const { student_id, student_name, week_number, note, project_link } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu file upload!" });
    }

    // Đường dẫn file trên Cloudinary
    const file_url = req.file.path;

    await pool.query(
      `INSERT INTO submissions (student_id, student_name, week_number, file_path, note, project_link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [student_id, student_name, week_number, file_url, note, project_link]
    );


    res.json({
      success: true,
      message: "✅ Nộp bài thành công (đã lưu lên Cloudinary)!",
      file_url,
    });
  } catch (err) {
    console.error("❌ Lỗi khi nộp bài:", err);
    res.status(500).json({ success: false, message: "Lỗi khi nộp bài" });
  }
});

// ==== API GET /submissions ====
app.get("/submissions", async (req, res) => {
  try {
    const { student_id, week_number } = req.query;
    let query = "SELECT * FROM submissions WHERE 1=1";
    const params = [];

    if (student_id) {
      params.push(student_id);
      query += ` AND student_id = $${params.length}`;
    }
    if (week_number) {
      params.push(week_number);
      query += ` AND week_number = $${params.length}`;
    }

    query += " ORDER BY submitted_at DESC";

    const result = await pool.query(query, params);
    res.json({ success: true, submissions: result.rows });
  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi khi lấy dữ liệu submissions" });
  }
});

// ==== API DELETE /submission/:student_id/:week_number ====
app.delete("/submission/:student_id/:week_number", async (req, res) => {
  const { student_id, week_number } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM submissions WHERE student_id = $1 AND week_number = $2 RETURNING *`,
      [student_id, week_number]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài nộp để xoá!" });
    }

    res.json({ success: true, message: "🗑️ Huỷ bài nộp thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi huỷ bài nộp:", err);
    res.status(500).json({ success: false, message: "Lỗi khi huỷ bài nộp" });
  }
});

// ====================== KHỞI CHẠY SERVER ======================
app.listen(port, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${port}`);
});
