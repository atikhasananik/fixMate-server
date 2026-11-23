# FixMate Server 🛠️

Backend REST API server for the **FixMate** on-demand appliance & electronics repair platform. Built with Node.js, Express, MongoDB native driver, and Stripe for secure payments and webhooks.

---



---

## 🚀 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/) (v5)
- **Database**: [MongoDB](https://www.mongodb.com/) (Native MongoDB Node.js Driver v7)
- **Payment Processing**: [Stripe](https://stripe.com/) (Checkout Sessions & Webhook events)
- **Deployment**: Local Node / Nodemon / Vercel Serverless

---

## 📦 Project Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas cluster or local MongoDB instance
- Stripe account (for API test keys and webhooks)

### 2. Clone and Install Dependencies
```bash
cd fixmate-server
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
# Server Port (defaults to 5000 if omitted)
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority

# Secret API key for internal admin communications (must match Next.js frontend)
ADMIN_API_KEY=your_admin_secret_api_key_here

# Client Application URL
CLIENT_URL=http://localhost:3000
FONTEND_API=http://localhost:3000

# Stripe Credentials
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Running the Server

#### Development mode (auto-reload on file changes):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

---

## 📡 API Reference

### 🌐 Public & Service Discovery

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/` | Health check endpoint | None |
| `GET` | `/get-all-services` | Public service catalog with search, filter, and sort | `search`, `category`, `mode`, `availability`, `sort` |
| `GET` | `/get-single-service/:id` | Retrieve single service details by MongoDB `_id` | None |
| `GET` | `/get-featured-services` | Top 6 newest approved & available services for homepage | None |

#### `/get-all-services` Filtering Details:
- **`search`**: Case-insensitive substring match across `title`, `description`, `serviceArea`, and `category`.
- **`category`**: Exact match (`Smartphone`, `Laptop & PC`, `AC`, `Refrigerator`, `TV`, `Washing Machine`, `Electrical`).
- **`mode`**: `home-visit` ("Home Visit") or `shop-drop-off` ("Shop Drop-off").
- **`availability`**: `available` (`isAvailable: true`) or `unavailable` (`isAvailable: false`).
- **`sort`**: `newest` (default), `oldest`, `price-asc`, `price-desc`, `title-asc`.

---

### 📅 Bookings & Customer Operations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/add-booking` | Create a new booking request (prevents active duplicates) |
| `GET` | `/get-bookings/:email` | Get all bookings placed by a customer (`customerEmail`) |
| `GET` | `/get-booking-by-id/:id` | Get booking details by ID |
| `PATCH` | `/update-status/:id` | Update general booking fields/status |

---

### 💳 Stripe Payments & Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/create-payment-intent` | Creates a Stripe Checkout Session for a completed booking |
| `POST` | `/api/webhooks/stripe` | Stripe webhook listener for `checkout.session.completed` (raw payload) |

- When a checkout session completes, the webhook updates the booking's `paymentStatus` to `"paid"` and inserts a transaction log into the `payments` collection.

---

### 🔧 Technician Endpoints

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `POST` | `/add-service` | Add a new repair service listing | None |
| `GET` | `/get-services/:email` | Fetch all services created by a technician | None |
| `PATCH` | `/update-service/:id` | Update an existing service listing | None |
| `PATCH` | `/update-service-isavailable/:id` | Toggle service availability (`isAvailable`) | None |
| `DELETE` | `/delete-service/:id` | Delete a service listing | None |
| `GET` | `/get-booking-req/:email` | Fetch booking requests assigned to technician | `status` (`requested`, `accepted`, `in-progress`, `completed`) |
| `PATCH` | `/update-status-by-technician/:id` | Update status of an assigned booking | None |

---

### 🛡️ Admin Endpoints

| Method | Endpoint | Description | Headers / Query |
|---|---|---|---|
| `GET` | `/get-all-users` | Fetch all registered users | None |
| `PATCH` | `/update-role-by-admin` | Assign user role (`customer`, `technician`, `admin`) | **Header**: `x-admin-api-key: <ADMIN_API_KEY>` |
| `GET` | `/get-all-services-by-admin` | Service moderation list (sorted pending first) | `approvalStatus` (`pending`, `approved`, `rejected`) |
| `GET` | `/get-bookings-by-admin` | Search and filter all platform bookings | `status`, `search`, `sort` |

> [!NOTE]
> `/update-role-by-admin` requires the secret `x-admin-api-key` header to ensure only server-to-server calls from the authorized Next.js frontend can alter user permissions. `admin@fixmate.com` is protected against role modification.

---

## 🗄️ Database Collections (`fixMate`)

- **`services`**: Stores repair service offerings (title, category, pricing, duration, availability, approvalStatus, technician info).
- **`bookings`**: Customer bookings pipeline (`requested` → `accepted` → `in-progress` → `completed` / `rejected` / `cancelled`).
- **`payments`**: Payment transaction logs populated from Stripe webhooks.
- **`user`**: BetterAuth user accounts & platform roles.

---

## 📄 License
ISC
