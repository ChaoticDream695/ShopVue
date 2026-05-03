# 🛍️ ShopVue — Full-Stack E-Commerce Application

A complete e-commerce platform built with **Vue 3** (frontend), **Express.js** (backend), and **PostgreSQL** (database).

---

## 📁 Project Structure

```
ecommerce/
├── backend/                    # Express REST API
│   ├── src/
│   │   ├── app.js              # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js     # PostgreSQL pool
│   │   │   ├── schema.sql      # Database schema (run once)
│   │   │   └── seed.js         # Demo data seeder
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── categoryController.js
│   │   │   └── orderController.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authentication + role guards
│   │   │   ├── errorHandler.js # Global error handler
│   │   │   ├── logger.js       # Request logger
│   │   │   └── validate.js     # Body validation helpers
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── products.js
│   │       ├── categories.js
│   │       └── orders.js
│   ├── tests/
│   │   ├── helpers.js          # Test DB setup & token factories
│   │   ├── auth.test.js
│   │   ├── products.test.js
│   │   ├── categories.test.js
│   │   └── orders.test.js
│   ├── .env                    # Environment variables (edit me!)
│   ├── .eslintrc.json
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Vue 3 + Vite SPA
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── assets/
│   │   │   └── main.css        # Global design system
│   │   ├── components/
│   │   │   ├── AppNav.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── AlertMessage.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   ├── ProductCard.vue
│   │   │   └── ToastMessage.vue
│   │   ├── composables/
│   │   │   ├── useApi.js
│   │   │   └── useToast.js
│   │   ├── router/
│   │   │   └── index.js
│   │   ├── store/
│   │   │   ├── auth.js         # Pinia auth store
│   │   │   └── cart.js         # Pinia cart store (localStorage)
│   │   ├── utils/
│   │   │   └── api.js          # Axios instance + interceptors
│   │   └── views/
│   │       ├── LoginView.vue
│   │       ├── RegisterView.vue
│   │       ├── NotFoundView.vue
│   │       ├── admin/
│   │       │   ├── AdminDashboard.vue
│   │       │   ├── AdminProducts.vue
│   │       │   ├── AdminCategories.vue
│   │       │   └── AdminOrders.vue
│   │       └── customer/
│   │           ├── ShopView.vue
│   │           ├── ProductDetailView.vue
│   │           ├── CartView.vue
│   │           └── OrdersView.vue
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Option A — Docker Compose (recommended)

```bash
# 1. Clone / unzip the project
cd ecommerce

# 2. Start everything
docker compose up --build

# Frontend  →  http://localhost:5173
# Backend   →  http://localhost:3000
# API docs  →  http://localhost:3000/api/health
```

### Option B — Manual (local PostgreSQL)

#### 1. Set up PostgreSQL

```bash
# Create databases
createdb ecommerce_db
createdb ecommerce_test_db   # for tests

# Run schema
psql -d ecommerce_db -f backend/src/config/schema.sql
```

#### 2. Backend

```bash
cd backend
cp .env.example .env          # edit DB credentials if needed
npm install
npm run seed                  # optional: load demo data
npm run dev                   # http://localhost:3000
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

---

## 🧪 Running Tests

```bash
cd backend

# Make sure ecommerce_test_db exists and schema.sql has been run on it
# (the test suite auto-creates and drops tables)

npm test                  # run all tests
npm run test:coverage     # with coverage report
npm run test:watch        # watch mode
npm run lint              # ESLint check
npm run lint:fix          # auto-fix lint issues
```

---

## 👤 Demo Accounts (after seed)

| Role     | Username     | Password      |
|----------|-------------|---------------|
| Admin    | `admin`     | `admin123`    |
| Customer | `john_doe`  | `customer123` |
| Customer | `jane_smith`| `customer123` |

---

## 🔌 API Reference

### Auth

| Method | Endpoint          | Access  | Description           |
|--------|------------------|---------|-----------------------|
| POST   | /api/auth/register | Public | Register user         |
| POST   | /api/auth/login    | Public | Login, returns JWT    |
| GET    | /api/auth/me       | Auth   | Get current user info |

**Register payload:**
```json
{
  "username": "alice",
  "password": "secret123",
  "role": "customer",
  "firstname": "Alice",
  "lastname": "Martin",
  "email": "alice@example.com",
  "phone_number": "0612345678"
}
```

**Login payload:**
```json
{ "username": "alice", "password": "secret123" }
```

**Login response:**
```json
{
  "token": "<JWT>",
  "user": { "uauth_id": 1, "username": "alice", "role": "customer", "customer_id": 1 }
}
```

All protected routes require:
```
Authorization: Bearer <token>
```

---

### Products

| Method | Endpoint           | Access | Description              |
|--------|-------------------|--------|--------------------------|
| GET    | /api/products      | Public | List (search, page, filter) |
| GET    | /api/products/:id  | Public | Get one product          |
| POST   | /api/products      | Admin  | Create product           |
| PUT    | /api/products/:id  | Admin  | Update product           |
| DELETE | /api/products/:id  | Admin  | Delete product           |

**Query params for GET /api/products:**
- `search=laptop` — full-text search on product_name
- `category_id=2` — filter by category
- `page=1&limit=20` — pagination

---

### Categories

| Method | Endpoint              | Access | Description     |
|--------|-----------------------|--------|-----------------|
| GET    | /api/categories       | Public | List all        |
| GET    | /api/categories/:id   | Public | Get one         |
| POST   | /api/categories       | Admin  | Create          |
| PUT    | /api/categories/:id   | Admin  | Update          |
| DELETE | /api/categories/:id   | Admin  | Delete          |

---

### Orders

| Method | Endpoint                  | Access   | Description                     |
|--------|--------------------------|----------|---------------------------------|
| POST   | /api/orders               | Customer | Place order (deducts stock)     |
| GET    | /api/orders               | Auth     | List (customers: own / admin: all) |
| GET    | /api/orders/:id           | Auth     | Get one order                   |
| PATCH  | /api/orders/:id/status    | Admin    | Update order status             |

**Place order payload:**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ]
}
```

**Order statuses:** `pending` → `confirmed` → `shipped` → `delivered` | `cancelled`

---

## 🎨 Frontend Pages

### Customer
- `/shop` — Product listing with search & category filter
- `/shop/product/:id` — Product detail with quantity picker
- `/cart` — Cart management + order placement
- `/orders` — Order history

### Admin
- `/admin` — Dashboard with stats & recent orders
- `/admin/products` — Full CRUD for products
- `/admin/categories` — Full CRUD for categories
- `/admin/orders` — View all orders, update status

---

## 🔐 Security Notes

- Passwords hashed with **bcrypt** (salt rounds: 10)
- JWT tokens expire after **7 days** (configurable)
- Role-based route guards on both frontend and backend
- DB transactions used for order creation (atomic stock deduction)
- Input sanitisation middleware strips whitespace
- PostgreSQL constraint errors mapped to proper HTTP responses
- Change `JWT_SECRET` in `.env` before production deployment

---

## 🛠 Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Frontend  | Vue 3, Vite, Vue Router, Pinia  |
| Backend   | Node.js, Express.js             |
| Database  | PostgreSQL (pg driver)          |
| Auth      | JWT (jsonwebtoken), bcryptjs    |
| Testing   | Jest, Supertest, ESLint         |
| Container | Docker, Docker Compose, Nginx   |
