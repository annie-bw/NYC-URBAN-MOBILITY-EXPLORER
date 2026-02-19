const http = require("http");

const BASE = "http://localhost:5000/api";
let passed = 0;
let failed = 0;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(BASE + path, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    }).on("error", reject);
  });
}

function check(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

async function paginationConsistency() {
  console.log("\nPagination — cross-page consistency");

  const p1 = await get("/trips?page=1&limit=10");
  const p2 = await get("/trips?page=2&limit=10");
  const p3 = await get("/trips?page=3&limit=10");

  check("page 1 status 200", p1.status === 200);
  check("page 2 status 200", p2.status === 200);
  check("all pages report same total", p1.body.total === p2.body.total && p2.body.total === p3.body.total);
  check("all pages report same totalPages", p1.body.totalPages === p2.body.totalPages);

  if (p1.body.data.length > 0 && p2.body.data.length > 0) {
    const ids1 = p1.body.data.map((t) => t.trip_id);
    const ids2 = p2.body.data.map((t) => t.trip_id);
    const ids3 = p3.body.data.map((t) => t.trip_id);
    check("pages 1 and 2 share no trips", ids1.filter((id) => ids2.includes(id)).length === 0);
    check("pages 2 and 3 share no trips", ids2.filter((id) => ids3.includes(id)).length === 0);
  }

  const big = await get("/trips?page=1&limit=100");
  check("limit 100 returns at most 100 rows", big.body.data.length <= 100);
}

async function filteredVsUnfiltered() {
  console.log("\nFiltered totals — always less than or equal to unfiltered");

  const all = await get("/analytics/filtered-stats");
  const byBorough = await get("/analytics/filtered-stats?borough=Brooklyn");
  const byFare = await get("/analytics/filtered-stats?fareMin=30");
  const byTime = await get("/analytics/filtered-stats?timeOfDay=night");

  if (all.body.data) {
    const total = all.body.data.total_trips;
    if (byBorough.body.data) check("borough filter <= total", byBorough.body.data.total_trips <= total);
    if (byFare.body.data) check("fare filter <= total", byFare.body.data.total_trips <= total);
    if (byTime.body.data) check("time filter <= total", byTime.body.data.total_trips <= total);
  }
}

async function multipleBoroughs() {
  console.log("\nMultiple borough params");

  const manhattan = await get("/analytics/filtered-stats?borough=Manhattan");
  const bronx = await get("/analytics/filtered-stats?borough=Bronx");
  const both = await get("/analytics/filtered-stats?borough=Manhattan&borough=Bronx");

  if (manhattan.body.data && bronx.body.data && both.body.data) {
    check(
      "two boroughs combined <= sum of each individually",
      both.body.data.total_trips <= manhattan.body.data.total_trips + bronx.body.data.total_trips
    );
    check(
      "two boroughs combined >= either one alone",
      both.body.data.total_trips >= manhattan.body.data.total_trips &&
      both.body.data.total_trips >= bronx.body.data.total_trips
    );
  }

  const trips = await get("/trips?borough=Manhattan&borough=Queens&limit=50");
  check("multi-borough trips endpoint 200", trips.status === 200);
}

async function dateRangeFilter() {
  console.log("\nDate range — narrower always produces fewer or equal trips");

  const wide = await get("/analytics/filtered-stats?startDate=2024-01-01&endDate=2024-01-31");
  const narrow = await get("/analytics/filtered-stats?startDate=2024-01-10&endDate=2024-01-15");

  if (wide.body.data && narrow.body.data) {
    check("narrow range <= wide range", narrow.body.data.total_trips <= wide.body.data.total_trips);
  }

  const sameDay = await get("/trips?startDate=2024-01-15&endDate=2024-01-15&limit=50");
  check("same-day range returns 200", sameDay.status === 200);
}

async function fareFilterAccuracy() {
  console.log("\nFare filter — results respect the threshold");

  const r = await get("/trips?fareMin=20&limit=100");
  check("fareMin filter 200", r.status === 200);

  if (r.body.data.length > 0) {
    check(
      "every trip has fare >= 20",
      r.body.data.every((t) => parseFloat(t.fare_amount) >= 20)
    );
  }

  const low = await get("/analytics/filtered-stats?fareMin=5");
  const high = await get("/analytics/filtered-stats?fareMin=80");
  if (low.body.data && high.body.data) {
    check("higher fareMin produces fewer trips", high.body.data.total_trips <= low.body.data.total_trips);
  }
}

async function timeOfDayFilter() {
  console.log("\nTime-of-day filter — all five slots accepted");

  for (const slot of ["early", "morning", "midday", "evening", "night"]) {
    const r = await get(`/trips?timeOfDay=${slot}&limit=10`);
    check(`timeOfDay=${slot} returns 200`, r.status === 200);
  }

  const morning = await get("/analytics/filtered-stats?timeOfDay=morning");
  const all = await get("/analytics/filtered-stats");
  if (morning.body.data && all.body.data) {
    check("morning subset is smaller than full dataset", morning.body.data.total_trips <= all.body.data.total_trips);
  }
}

async function combinedFilters() {
  console.log("\nCombined filters — additive narrowing");

  const borough = await get("/analytics/filtered-stats?borough=Queens");
  const boroughAndTime = await get("/analytics/filtered-stats?borough=Queens&timeOfDay=morning");
  const boroughTimeAndFare = await get("/analytics/filtered-stats?borough=Queens&timeOfDay=morning&fareMin=15");

  if (borough.body.data && boroughAndTime.body.data) {
    check("adding time narrows Queens result", boroughAndTime.body.data.total_trips <= borough.body.data.total_trips);
  }
  if (boroughAndTime.body.data && boroughTimeAndFare.body.data) {
    check("adding fare narrows further", boroughTimeAndFare.body.data.total_trips <= boroughAndTime.body.data.total_trips);
  }

  const combo = await get("/trips?borough=Manhattan&fareMin=10&timeOfDay=evening&limit=50");
  check("combined filter trips request 200", combo.status === 200);
  if (combo.body.data.length > 0) {
    check(
      "fares respect fareMin in combined request",
      combo.body.data.every((t) => parseFloat(t.fare_amount) >= 10)
    );
  }
}

async function heatmapIntegrity() {
  console.log("\nHeatmap — borough names and structure");

  const r = await get("/analytics/heat-map");
  check("heatmap returns array", Array.isArray(r.body));

  const known = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
  const names = r.body.map((b) => b.name);
  check("no null or unknown borough names", names.every((n) => n && known.includes(n)));

  let totalTrips = 0;
  r.body.forEach((b) => {
    Object.values(b.hours).forEach((h) => { totalTrips += h.trips || 0; });
  });
  check("heatmap trip total is positive", totalTrips > 0);

  const boroughHeatmap = await get("/analytics/heat-map?borough=Bronx");
  check("borough-filtered heatmap 200", boroughHeatmap.status === 200);
  check("filtered heatmap is array", Array.isArray(boroughHeatmap.body));
}

async function anomalyIntegrity() {
  console.log("\nAnomaly detector — sorting and counts");

  const r = await get("/analytics/anomalies");
  const { summary, speedAnomalies, fareAnomalies } = r.body;

  check(
    "speed count in summary matches array",
    summary.speedTooFast + summary.speedTooSlow === speedAnomalies.length
  );
  check(
    "fare count in summary matches array",
    summary.fareTooHigh + summary.fareTooLow === fareAnomalies.length
  );

  if (speedAnomalies.length > 1) {
    const descending = speedAnomalies.every(
      (a, i) => i === 0 || Math.abs(a.zScore) <= Math.abs(speedAnomalies[i - 1].zScore)
    );
    check("speed anomalies sorted by |zScore| descending", descending);
  }

  if (fareAnomalies.length > 1) {
    const descending = fareAnomalies.every(
      (a, i) => i === 0 || Math.abs(a.zScore) <= Math.abs(fareAnomalies[i - 1].zScore)
    );
    check("fare anomalies sorted by |zScore| descending", descending);
  }

  const withFilter = await get("/analytics/anomalies?borough=Manhattan");
  check("anomalies endpoint ignores filter params", withFilter.status === 200);
  if (r.body.summary && withFilter.body.summary) {
    check(
      "anomaly total unchanged with borough param",
      r.body.summary.totalTripsAnalyzed === withFilter.body.summary.totalTripsAnalyzed
    );
  }
}

async function cityOverviewStatic() {
  console.log("\nCity overview — never changes with filters");

  const plain = await get("/analytics/city-overview");
  const filtered = await get("/analytics/city-overview?borough=Manhattan&fareMin=50");

  if (plain.body.data && filtered.body.data) {
    check(
      "total_trips identical regardless of query params",
      plain.body.data[0].total_trips === filtered.body.data[0].total_trips
    );
    check(
      "average_fare identical regardless of query params",
      plain.body.data[0].average_fare === filtered.body.data[0].average_fare
    );
  }
}

async function zoneStatsVsFilteredStats() {
  console.log("\nZone stats — cross-check with zones list");

  const zones = await get("/zones");
  check("zones available", zones.status === 200 && zones.body.data.length > 0);

  if (zones.body.data.length > 0) {
    const id = zones.body.data[0].zone_id;

    const stats = await get(`/analytics/zone-stats?zone_id=${id}`);
    check(`zone ${id} returns 200`, stats.status === 200);
    check("zone stats data is array", Array.isArray(stats.body.data));

    const tripsForZone = await get(`/trips?zone_id=${id}&limit=5`);
    check("trips endpoint accepts zone_id", tripsForZone.status === 200);
  }

  const bad = await get("/analytics/zone-stats?zone_id=999999");
  check("non-existent zone returns 200 with empty data", bad.status === 200);
}

async function run() {
  console.log("=== Integration Tests ===");
  console.log("Target:", BASE, "\n");

  try {
    await paginationConsistency();
    await filteredVsUnfiltered();
    await multipleBoroughs();
    await dateRangeFilter();
    await fareFilterAccuracy();
    await timeOfDayFilter();
    await combinedFilters();
    await heatmapIntegrity();
    await anomalyIntegrity();
    await cityOverviewStatic();
    await zoneStatsVsFilteredStats();
  } catch (err) {
    console.error("\nConnection failed:", err.message);
    console.error("Start the backend with: cd backend && npm run dev");
    process.exit(1);
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
