// frontend/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { get, post, put, del } from '../api/client.js';
import { apiStaticOrigin } from '../api/env.js';
import { GENRES } from '../utils/bookUtils.js';
import { useNavigate } from 'react-router-dom';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    genre: 'Роман',
    year: '',
    description: '',
    cover: null,
  });
  const [preview, setPreview] = useState(null);

  // Загрузка всех книг
  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadBooks();
  }, [user]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await get('/admin/books', token);
      setBooks(data);
    } catch (err) {
      showToast(err.message, 'e');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm(prev => ({ ...prev, cover: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      author: '',
      genre: 'Роман',
      year: '',
      description: '',
      cover: null,
    });
    setPreview(null);
    setEditingBook(null);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      year: book.year || '',
      description: book.description || '',
      cover: null,
    });
    setPreview(book.cover_url?.startsWith('/uploads') ? `${apiStaticOrigin()}${book.cover_url}` : book.cover_url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('author', form.author);
    formData.append('genre', form.genre);
    formData.append('year', form.year);
    formData.append('description', form.description);
    if (form.cover) {
      formData.append('cover', form.cover);
    }

    try {
      if (editingBook) {
        await put(`/admin/books/${editingBook.id}`, formData, token, true); // true – formData
        showToast('Книга обновлена', 's');
      } else {
        await post('/admin/books', formData, token, true);
        showToast('Книга добавлена', 's');
      }
      resetForm();
      loadBooks();
    } catch (err) {
      showToast(err.message, 'e');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Удалить книгу «${title}»?`)) return;
    try {
      await del(`/admin/books/${id}`, token);
      showToast('Книга удалена', 'i');
      loadBooks();
    } catch (err) {
      showToast(err.message, 'e');
    }
  };

  if (user?.role !== 'admin') {
    return <div className={styles.forbidden}>Доступ запрещён</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Админ-панель</h1>
        <div className={styles.linksRow}>
          <button className={styles.linkBtn} onClick={() => navigate('/admin/analytics')}>Аналитика</button>
          <button className={styles.linkBtn} onClick={() => navigate('/admin/reviews')}>Отзывы</button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Форма добавления/редактирования */}
        <div className={styles.formSection}>
          <h2>{editingBook ? 'Редактировать книгу' : 'Добавить новую книгу'}</h2>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className={styles.formGroup}>
              <label>Название *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Автор *</label>
              <input
                type="text"
                name="author"
                value={form.author}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Жанр</label>
                <select name="genre" value={form.genre} onChange={handleInputChange}>
                  {GENRES.slice(1).map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Год</label>
                <input
                  type="number"
                  name="year"
                  value={form.year}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Описание</label>
              <textarea
                name="description"
                rows="4"
                value={form.description}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Обложка</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {preview && (
                <div className={styles.preview}>
                  <img src={preview} alt="Предпросмотр" />
                </div>
              )}
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn}>
                {editingBook ? 'Сохранить' : 'Добавить'}
              </button>
              {editingBook && (
                <button type="button" className={styles.cancelBtn} onClick={resetForm}>
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Список книг */}
        <div className={styles.listSection}>
          <h2>Все книги ({books.length})</h2>
          {loading ? (
            <div>Загрузка...</div>
          ) : (
            <div className={styles.bookList}>
              {books.map(book => (
                <div key={book.id} className={styles.bookItem}>
                  <div className={styles.bookCover}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url.startsWith('/uploads')
                          ? `${apiStaticOrigin()}${book.cover_url}`
                          : book.cover_url}
                        alt={book.title}
                      />
                    ) : (
                      <span>{book.cover_emoji}</span>
                    )}
                  </div>
                  <div className={styles.bookInfo}>
                    <div className={styles.bookTitle}>{book.title}</div>
                    <div className={styles.bookAuthor}>{book.author}</div>
                    <div className={styles.bookMeta}>{book.genre} · {book.year}</div>
                  </div>
                  <div className={styles.bookActions}>
                    <button onClick={() => handleEdit(book)} className={styles.editBtn}>
                      ✎
                    </button>
                    <button onClick={() => handleDelete(book.id, book.title)} className={styles.deleteBtn}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}