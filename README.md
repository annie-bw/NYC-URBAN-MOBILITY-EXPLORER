# NYC Urban Mobility Explorer

A fullstack dashboard for exploring New York City taxi trip data. Filter by borough, date, time of day, and fare — the charts, heatmap, and statistics all update in real time.

---

## Live Demo

Frontend: https://nyc-urban-mobility-explorer-frontend.onrender.com

Backend API: https://nyc-urban-mobility-explorer.onrender.com

> The backend is on Render's free tier so it sleeps after 15 minutes of inactivity. The first request after idle takes about 30–60 seconds to wake up — just give it a moment.

---

Demo_video: https://drive.google.com/file/d/1DQPRh_3GS1LT6QCyqVPPmEbqiARRFZLg/view?usp=sharing

## Running locally

### What you need

- Node.js v14+
- PostgreSQL or CockroachDB
- Python 3.8+ (only for the data pipeline)

### Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=5000
```

Then start it:

```bash
npm run dev
```

API runs at `http://localhost:5000/api`.

### Frontend

Open `frontend/js/api.js` and change `API_BASE` back to localhost:

```js
var API_BASE = "http://localhost:5000";
```

Then serve the frontend:

```bash
cd frontend
npx serve -l 3000
```

Open `http://localhost:3000`.

### Database (first time only)

Put your data files in the `database/` folder, then run:

```bash
cd database
pip install pandas pyarrow psycopg2-binary python-dotenv
python populate-db.py
```

This cleans the raw data, computes derived features, and inserts everything into your database.

---

## Project structure

```
NYC-URBAN-MOBILITY-EXPLORER/
├── backend/
│   ├── controllers/             # Handles API logic
│   ├── routes/                  # API route definitions
│   ├── services/                # Business logic / data services
│   ├── utils/                   # Helpers (query builder, pagination, etc.)
│   ├── algorithms/              # Algorithms (e.g., z-score anomaly detector, std dev, sort)
│   ├── middleware/              # Express middleware (auth, validation)
│   ├── tests/                   # Backend tests (unit/integration)
│   ├── server.js                # Main backend server entrypoint
├── frontend/
│   ├── js/
│   │   ├── api.js               # API interaction module
│   │   ├── filters.js           # Filter logic
│   │   └── summary-cards.js     # Dashboard card UI logic
│   ├── styles/                  # CSS styles
│   ├── index.html               # Frontend HTML
│   └── script.js                # Frontend logic
├── database/
│   ├── schema.sql               # Database table definitions
│   ├── indexes.sql              # Index creation SQL for query performance
│   └── populate-db.py           # Python ETL for taxi data ingestion
├── docs/                       
│   ├── architecture.jpeg         # System/architecture overview
│   ├── backend_guide.md          # API specification / endpoints
│   └── data-dictionary.md       # Data schema & field descriptions
├── tests/                       
│   ├── test_api.cjs              
│   ├── test_integration.cjs               
├── .env.example                 
├── .gitignore                                     
├── README.md                  
├── package.json              
└── requirements.txt          

```

---

## API endpoints

Base URL: `https://nyc-urban-mobility-explorer.onrender.com/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips` | Paginated trips. Accepts `page`, `limit`, `borough`, `startDate`, `endDate`, `fareMin`, `timeOfDay`, `zone_id` |
| GET | `/zones` | All taxi zones |
| GET | `/analytics/city-overview` | City-wide totals — never filtered |
| GET | `/analytics/top-routes` | Top 10 busiest routes |
| GET | `/analytics/heat-map` | Trip counts by borough and hour |
| GET | `/analytics/time-series` | Daily trip counts |
| GET | `/analytics/zone-stats` | Stats for one zone — requires `zone_id` |
| GET | `/analytics/filtered-stats` | Totals for the current filter selection |
| GET | `/analytics/anomalies` | Speed and fare outliers — always city-wide |
| POST | `/analytics/custom-filter` | Filter trips by fare range and zone |

---

## Tech stack

- **Backend** — Node.js, Express, PostgreSQL (pg)
- **Frontend** — HTML, CSS, vanilla JavaScript, Chart.js
- **Database** — CockroachDB (PostgreSQL-compatible)
- **Hosting** — Render (backend + frontend), CockroachDB Cloud

## Team Task Sheet

https://docs.google.com/spreadsheets/d/191ep4r3dklFSkQ4HFk8b7ltgqmbTQ4XkpPc68KMtlRE/edit?usp=drivesdk
