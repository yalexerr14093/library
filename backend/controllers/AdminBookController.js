// controllers/AdminBookController.js
const BookModel = require("../models/BookModel");
const { pool } = require("../db");
const AuditLogModel = require("../models/AuditLogModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/covers");
    // Создаём папку, если её нет
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    } else {
      cb(new Error("Только изображения (JPEG, PNG, GIF, WEBP)"));
    }
  }
}).single("cover"); // поле в форме должно называться "cover"

const AdminBookController = {
  // Получить все книги (для админки)
  async getAll(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT b.*, 
          ROUND(AVG(r.rating), 1) as avg_rating,
          COUNT(r.id) as review_count
        FROM books b
        LEFT JOIN reviews r ON r.book_id = b.id
        GROUP BY b.id
        ORDER BY b.id DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения книг" });
    }
  },

  // Получить одну книгу для редактирования
  async getOne(req, res) {
    try {
      const book = await BookModel.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Книга не найдена" });
      res.json(book);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения книги" });
    }
  },

  // Создать новую книгу (с загрузкой обложки)
  async create(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const { title, author, genre, year, description } = req.body;
      if (!title?.trim() || !author?.trim() || !genre?.trim()) {
        return res.status(400).json({ error: "Название, автор и жанр обязательны" });
      }

      try {
        const t = title.trim();
        const a = author.trim();
        if (await BookModel.findDuplicateId(t, a)) {
          return res.status(409).json({ error: "Такая книга уже есть в каталоге (то же название и автор)" });
        }

        const yearVal = year ? parseInt(year) : null;
        if (year && !Number.isFinite(yearVal)) {
          return res.status(400).json({ error: "Некорректный год" });
        }

        let coverUrl = null;
        if (req.file) {
          // Сохраняем относительный путь (например, /uploads/covers/filename.jpg)
          coverUrl = `/uploads/covers/${req.file.filename}`;
        }

        const book = await BookModel.create({
          title: t,
          author: a,
          genre,
          year: yearVal,
          coverEmoji: "📖", // заглушка
          description: description?.trim() || "",
          coverUrl,
        });

        await AuditLogModel.write({
          userId: req.user?.id ?? null,
          action: "create",
          entity: "book",
          entityId: book.id,
          meta: { title: book.title, author: book.author },
        });

        res.status(201).json(book);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка создания книги" });
      }
    });
  },

  // Обновить книгу (с возможностью заменить обложку)
  async update(req, res) {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const id = parseInt(req.params.id);
      const { title, author, genre, year, description } = req.body;

      try {
        const existing = await BookModel.findById(id);
        if (!existing) return res.status(404).json({ error: "Книга не найдена" });

        const t = title?.trim();
        const a = author?.trim();
        if (t && a) {
          const dup = await BookModel.findDuplicateId(t, a, id);
          if (dup) {
            return res.status(409).json({ error: "Такая книга уже есть в каталоге (то же название и автор)" });
          }
        }

        const yearVal = year ? parseInt(year) : null;
        if (year && !Number.isFinite(yearVal)) {
          return res.status(400).json({ error: "Некорректный год" });
        }

        let coverUrl = existing.cover_url;
        if (req.file) {
          // Удаляем старый файл, если он есть и это локальный файл (не внешняя ссылка)
          if (existing.cover_url && existing.cover_url.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '..', existing.cover_url);
            try {
              await fs.unlink(oldPath);
            } catch (e) {
              console.warn('Не удалось удалить старый файл:', e.message);
            }
          }
          coverUrl = `/uploads/covers/${req.file.filename}`;
        }

        await pool.query(
          `UPDATE books 
           SET title = $1, author = $2, genre = $3, year = $4, description = $5, cover_url = $6
           WHERE id = $7`,
          [t, a, genre, yearVal, description?.trim(), coverUrl, id]
        );

        const updated = await BookModel.findById(id);
        await AuditLogModel.write({
          userId: req.user?.id ?? null,
          action: "update",
          entity: "book",
          entityId: id,
          meta: {
            before: { title: existing.title, author: existing.author, cover_url: existing.cover_url },
            after: { title: updated.title, author: updated.author, cover_url: updated.cover_url },
          },
        });
        res.json(updated);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка обновления книги" });
      }
    });
  },

  // Удалить книгу (и файл обложки, если локальный)
  async delete(req, res) {
    try {
      const id = parseInt(req.params.id);
      const book = await BookModel.findById(id);
      if (!book) return res.status(404).json({ error: "Книга не найдена" });

      // Удаляем файл обложки, если он локальный
      if (book.cover_url && book.cover_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', book.cover_url);
        try {
          await fs.unlink(filePath);
        } catch (e) {
          console.warn('Не удалось удалить файл обложки:', e.message);
        }
      }

      await pool.query("DELETE FROM books WHERE id = $1", [id]);
      await AuditLogModel.write({
        userId: req.user?.id ?? null,
        action: "delete",
        entity: "book",
        entityId: id,
        meta: { title: book.title, author: book.author, cover_url: book.cover_url },
      });
      res.json({ message: "Книга удалена" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка удаления книги" });
    }
  }
};

module.exports = AdminBookController;