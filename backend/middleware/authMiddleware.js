// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "biblioteka-secret-key";

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Требуется авторизация" });
  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Недействительный токен" });
  }
};
