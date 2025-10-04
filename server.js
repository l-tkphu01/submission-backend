import express from "express";
import multer from "multer";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import fs from "fs";

// ====================== CẤU HÌNH CƠ BẢN ======================
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ====================== CẤU HÌNH KẾT NỐI POSTGRESQL ======================
// 🔹 Khi deploy Render: dùng DATABASE_URL + SSL
// 🔹 Khi chạy local: điền trực tiếp user, host, password, db, port, ssl: false

const isRender = !!process.env.DATABASE_URL;

const pool = new Pool(
  isRender
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: "postgres",       // ⚠️ đổi nếu username khác
        host: "localhost",      // hoặc 127.0.0.1
        database: "postgres",   // ⚠️ đổi thành DB bạn đang dùng
        password: "kIMPHU@290105.",       // ⚠️ mật khẩu PostgreSQL
        port: 5432,
        ssl: false,
      }
);

// ====================== CẤU HÌNH LƯU FILE UPLOAD ======================
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ====================== ROUTES ======================

// Test route để kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.send("✅ Backend đang chạy ổn định 🚀");
});

// ==== API POST /submit ====
app.post("/submit", upload.single("file"), async (req, res) => {
  try {
    const { student_id, student_name, week_number, note } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Thiếu file upload!" });
    }

    const file_path = "/uploads/" + req.file.filename;

    await pool.query(
      `INSERT INTO submissions (student_id, student_name, week_number, file_path, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [student_id, student_name, week_number, file_path, note]
    );

    res.json({ success: true, message: "✅ Nộp bài thành công!" });
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

    // ✅ THAY ĐỔI Ở ĐÂY
    res.json({ success: true, submissions: result.rows });

  } catch (err) {
    console.error("❌ Lỗi khi lấy dữ liệu:", err);
    res.status(500).json({ success: false, message: "Lỗi khi lấy dữ liệu" });
  }
});

// ====================== KHỞI CHẠY SERVER ======================
app.listen(port, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${port}`);
});
