const Media = require("../model/Media");

// GET /media?parentId=&parentType=
exports.getMedia = async (req, res, next) => {
  try {
    const { parentId, parentType } = req.query;
    const filter = {};
    if (parentId) filter.parentId = parentId;
    if (parentType) filter.parentType = parentType;

    const media = await Media.find(filter)
      .populate("uploadedBy", "firstName lastName")
      .sort({ order: 1 });

    res.json(media);
  } catch (err) { next(err); }
};

// POST /media  (multipart/form-data — champ "file")
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });

    const ext  = req.file.mimetype.startsWith("video") ? "video" : "image";
    const url  = `/uploads/${req.file.filename}`;

    const media = await Media.create({
      url,
      type:       ext,
      parentType: req.body.parentType,
      parentId:   req.body.parentId,
      caption:    req.body.caption || "",
      order:      Number(req.body.order) || 0,
      uploadedBy: req.user._id,
    });

    res.status(201).json(media);
  } catch (err) { next(err); }
};

// PATCH /media/:id/approve
exports.approveMedia = async (req, res, next) => {
  try {
    const media = await Media.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.json(media);
  } catch (err) { next(err); }
};

// DELETE /media/:id
exports.deleteMedia = async (req, res, next) => {
  try {
    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: "Média supprimé" });
  } catch (err) { next(err); }
};
