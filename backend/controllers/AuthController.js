// controllers/AuthController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

const JWT_SECRET = process.env.JWT_SECRET || "biblioteka-secret-key";
const JWT_EXPIRES = "7d";

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isLikelyEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const em = normEmail(email);
      if (!name?.trim() || !em || !password)
        return res.status(400).json({ error: "Все поля обязательны" });
      if (!isLikelyEmail(em))
        return res.status(400).json({ error: "Некорректный email" });
      if (password.length < 6)
        return res.status(400).json({ error: "Пароль минимум 6 символов" });

      const existing = await UserModel.findByEmail(em);
      if (existing)
        return res.status(409).json({ error: "Email уже зарегистрирован" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ name: name.trim(), email: em, passwordHash });
      const { password_hash, ...safeUser } = user;
      res.status(201).json({ token: signToken(safeUser), user: safeUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка регистрации" });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const em = normEmail(email);
      if (!em || !password) return res.status(400).json({ error: "Email и пароль обязательны" });
      const user = await UserModel.findByEmail(em);
      if (!user) return res.status(401).json({ error: "Неверный email или пароль" });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Неверный email или пароль" });

      const { password_hash, ...safeUser } = user;
      res.json({ token: signToken(safeUser), user: safeUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка входа" });
    }
  },

  async me(req, res) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "Не найден" });
      const stats = await UserModel.getStats(req.user.id);
      res.json({ ...user, stats });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения профиля" });
    }
  },
};

module.exports = AuthController;  