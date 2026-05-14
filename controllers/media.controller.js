const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const Media        = require("../models/Media");
const { deleteUploadedFile } = require("../services/fileCleanup.service");

// GET /media?parentId=&parentType=
exports.getMedia = asyncHandler(async (req, res) => {
  const { parentId, parentType } = req.query;
  const filter = {};
  if (parentId)   filter.parentId   = parentId;
  if (parentType) filter.parentType = parentType;

  const media = await Media.find(filter)
    .populate("uploadedBy", "firstName lastName")
    .sort({ order: 1 });

  res.json(media);
});

// POST /media  (multipart/form-data — champ "file")
exports.uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Aucun fichier reçu");

  const type  = req.file.mimetype.startsWith("video") ? "video" : "image";
  const media = await Media.create({
    url:        `/uploads/${req.file.filename}`,
    type,
    parentType: req.body.parentType,
    parentId:   req.body.parentId,
    caption:    req.body.caption || "",
    order:      Number(req.body.order) || 0,
    uploadedBy: req.user._id,
  });

  res.status(201).json(media);
});

// PATCH /media/:id/approve
exports.approveMedia = asyncHandler(async (req, res) => {
  const media = await Media.findByIdAndUpdate(req.params.id, { status: "approved" }, { new: true });
  if (!media) throw new ApiError(404, "Média introuvable");
  res.json(media);
});

// PATCH /media/:id/reject
exports.rejectMedia = asyncHandler(async (req, res) => {
  const media = await Media.findByIdAndUpdate(req.params.id, { status: "rejected" }, { new: true });
  if (!media) throw new ApiError(404, "Média introuvable");
  res.json(media);
});

// DELETE /media/:id
exports.deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findByIdAndDelete(req.params.id);
  if (media) await deleteUploadedFile(media.url);
  res.json({ message: "Média supprimé" });
});
