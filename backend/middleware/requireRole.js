const UserModel = require("../models/UserModel");

module.exports = function requireRole(roles = []) {
  const allowed = new Set((roles || []).map(r => String(r).toLowerCase()));

  return async function requireRoleMiddleware(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      const role = String(user?.role || "user").toLowerCase();
      if (!user || !allowed.has(role)) {
        return res.status(403).json({ error: "Доступ запрещён." });
      }
      req.currentUser = user;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка проверки прав" });
    }
  };
};

