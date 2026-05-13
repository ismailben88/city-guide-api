const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const ApiError = require("../utils/ApiError");
const { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } = require("../config/constants");

// Use /tmp/uploads on Vercel (serverless), local uploads/ otherwise
const uploadDir = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_FILE_TYPES.test(ext)) return cb(null, true);
  cb(new ApiError(400, "Type de fichier non autorisé"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
