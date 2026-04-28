// controllers/RentalController.js
const { pool } = require("../db");
const BookModel = require("../models/BookModel");
const RentalModel = require("../models/RentalModel");
const { ReservationModel } = require("../models/index");

const RentalController = {
  async myRentals(req, res) {
    try {
      const rentals = await RentalModel.findAllByUser(req.user.id);
      res.json(rentals);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения аренд" });
    }
  },

  async rent(req, res) {
    const { book_id } = req.body;
    if (!book_id) return res.status(400).json({ error: "book_id обязателен" });

    try {
      const book = await BookModel.findById(book_id);
      if (!book) return res.status(404).json({ error: "Книга не найдена" });
      if (!book.available) return res.status(409).json({ error: "Книга уже арендована" });

      const existing = await RentalModel.findActiveByUserAndBook(req.user.id, book_id);
      if (existing) return res.status(409).json({ error: "Вы уже арендовали эту книгу" });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const rentalId = await RentalModel.create(req.user.id, book_id, dueDate.toISOString());
        await BookModel.setAvailable(book_id, false);
        await client.query('COMMIT');
        res.status(201).json({ id: rentalId, due_date: dueDate });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка при аренде" });
    }
  },

  async returnBook(req, res) {
    try {
      const rental = await RentalModel.findById(req.params.id);
      if (!rental || rental.user_id !== req.user.id)
        return res.status(404).json({ error: "Аренда не найдена" });
      if (rental.returned) return res.status(409).json({ error: "Уже возвращена" });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await RentalModel.markReturned(rental.id);
        await BookModel.setAvailable(rental.book_id, true);
        await ReservationModel.notifyFirst(rental.book_id);
        await client.query('COMMIT');
        res.json({ message: "Книга успешно возвращена" });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка при возврате" });
    }
  },
};

module.exports = RentalController;