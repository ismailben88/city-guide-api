const SUPPORTED = ["fr", "en", "ar"];

module.exports = (req, res, next) => {
  let lang = req.query.lang;

  if (!lang) {
    const header = req.headers["accept-language"] || "";
    lang = header.split(",")[0].split("-")[0].toLowerCase();
  }

  req.lang = SUPPORTED.includes(lang) ? lang : "fr";
  next();
};
