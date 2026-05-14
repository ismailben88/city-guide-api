const fs   = require("fs");
const path = require("path");

const getUploadsDir = () =>
  process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(__dirname, "..", "uploads");

// Extract bare filename from any of:
//   "http://host/uploads/abc.jpg"   → "abc.jpg"
//   "/uploads/abc.jpg"              → "abc.jpg"
//   "abc.jpg"                       → null  (no /uploads/ segment → skip)
const extractFilename = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const match = urlOrPath.match(/\/uploads\/([^/?#]+)/);
  return match ? match[1] : null;
};

const deleteUploadedFile = async (urlOrPath) => {
  const filename = extractFilename(urlOrPath);
  if (!filename) return;
  const filepath = path.join(getUploadsDir(), filename);
  try {
    await fs.promises.unlink(filepath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    // ENOENT = already gone — not an error
  }
};

const deleteUploadedFiles = async (urls = []) => {
  await Promise.all(urls.filter(Boolean).map(deleteUploadedFile));
};

module.exports = { getUploadsDir, extractFilename, deleteUploadedFile, deleteUploadedFiles };
