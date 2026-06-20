const jwt  = require("jsonwebtoken");
const ApiError = require("./ApiError");

const SECRET  = () => process.env.JWT_SECRET;
const EXPIRES = "7d";

// Accepts a user document (preferred — embeds its tokenVersion) or a raw id
// string (tv defaults to 0 for backward compatibility with older callers).
const signToken = (user) => {
  const id = user?._id ?? user;
  const tv = user?.tokenVersion ?? 0;
  return jwt.sign({ id, tv }, SECRET(), { expiresIn: EXPIRES });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET());
  } catch {
    throw new ApiError(401, "Token invalide ou expiré");
  }
};

module.exports = { signToken, verifyToken };
