# Deploy на Render (самый простой способ)

Этот проект разворачивается на Render в 1 репозиторий: **frontend + backend + PostgreSQL**. Пользовательское название сайта: **Книжная полка**. Имена сервисов ниже — технические идентификаторы из `render.yaml` (их можно изменить при необходимости).

## 1) Подготовка репозитория

- Убедись, что изменения закоммичены (в репозитории есть `render.yaml`).
- Запушь в GitHub.

## 2) Deploy

1. Открой Render → **New** → **Blueprint**.
2. Выбери свой GitHub репозиторий.
3. Render увидит `render.yaml` и предложит создать:
   - `biblioteka-postgres` (PostgreSQL)
   - `biblioteka-backend` (Node/Express)
   - `biblioteka-frontend` (Static/Vite)
4. Нажми **Apply** / **Deploy**.

## 3) Что получится

- URL фронта: `https://...` (Render покажет)
- URL бэка: `https://...` (Render покажет)

Фронтенд получит `VITE_API_URL` автоматически (из URL бэка).

## 4) Важно про обложки `/uploads`

На бесплатном плане Render диск может быть не постоянным. Если ты загружаешь обложки через админку, в проде лучше хранить их в S3/Cloudinary.

