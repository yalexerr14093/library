// middleware/adminMiddleware.js
const UserModel = require("../models/UserModel");

module.exports = async function adminMiddleware(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Доступ запрещён. Требуются права администратора." });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка проверки прав" });
  }
};