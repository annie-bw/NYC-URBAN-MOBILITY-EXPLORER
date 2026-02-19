# NYC Urban Mobility Explorer - Backend

This is the backend API for the NYC Urban Mobility Explorer, built with Node.js, Express, and PostgreSQL.## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [PostgreSQL](https://www.postgresql.org/) or [CockroachDB](https://www.cockroachlabs.com/)

### Environment Variables

Create a `.env` file in the `backend` directory with the following:

```env
DATABASE_URL=your_postgresql_url
```

**CockroachDB Cloud:** Use the exact connection string from the console (Connect → Connection string). If you get "password authentication failed", run:

```bash
node test-db-connection.js
```

Then in CockroachDB Cloud: **SQL Users** → your user → **Reset password**, copy the new password into `DATABASE_URL` in `.env`, and run the test again until it prints "OK – Connection works".

### Installation

```bash
git clone <repository-url>
cd NYC-URBAN-MOBILITY-EXPLORER/backend
npm install
```

### Running the Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

---

## 📡 API Documentation

**Base URL:** `http://localhost:5000/api`

### 📊 Analytics Endpoints

| Endpoint                   | Method | Description                          | Parameters                                                |
| :------------------------- | :----- | :----------------------------------- | :-------------------------------------------------------- |
| `/analytics/city-overview` | `GET`  | Get general city-wide statistics.    | None                                                      |
| `/analytics/top-routes`    | `GET`  | Get the most frequent travel routes. | None                                                      |
| `/analytics/heat-map`      | `GET`  | Get borough-level activity by hour.  | None                                                      |
| `/analytics/time-series`   | `GET`  | Get count of trips per day.          | None                                                      |
| `/analytics/zone-stats`    | `GET`  | Get statistics for a specific zone.  | `zone_id` (Query, Required)                               |
| `/analytics/anomalies`     | `GET`  | Detect unusual trip patterns.        | None                                                      |
| `/analytics/custom-filter` | `POST` | Filter trips by fare/zone.           | `fare_min`, `fare_max`, `pickup_zone_id` (Body, Optional) |

### 🗃️ Data Endpoints

| Endpoint | Method | Description                      | Parameters                        |
| :------- | :----- | :------------------------------- | :-------------------------------- |
| `/trips` | `GET`  | Get paginated list of all trips. | `page`, `limit` (Query, Optional) |
| `/zones` | `GET`  | Get list of all taxi zones.      | None                              |

---

## 🛠️ Tech Stack

- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg` pool)
- **CORS:** Enabled for all origins (`*`)
