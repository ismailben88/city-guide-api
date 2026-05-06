const jwt  = require("jsonwebtoken");
const ApiError = require("./ApiError");

const SECRET  = () => process.env.JWT_SECRET;
const EXPIRES = "7d";

const signToken = (id) =>
  jwt.sign({ id }, SECRET(), { expiresIn: EXPIRES });

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET());
  } catch {
    throw new ApiError(401, "Token invalide ou expiré");
  }
};

module.exports = { signToken, verifyToken };
