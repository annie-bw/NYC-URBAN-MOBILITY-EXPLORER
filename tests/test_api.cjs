const http = require("http");

const BASE = "http://localhost:5000/api";
let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path: "/api" + path,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const get = (path) => request("GET", path);
const post = (path, body) => request("POST", path, body);

function check(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

async function tripsBasic() {
  console.log("\n/trips");

  const r = await get("/trips");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));
  check("page field present", typeof r.body.page === "number");
  check("totalPages field present", typeof r.body.totalPages === "number");
  check("total field present", typeof r.body.total === "number");
  check("default page size <= 50", r.body.data.length <= 50);

  if (r.body.data.length > 0) {
    const t = r.body.data[0];
    check("trip has pickup_datetime", "pickup_datetime" in t);
    check("trip has dropoff_datetime", "dropoff_datetime" in t);
    check("trip has fare_amount", "fare_amount" in t);
    check("trip has trip_distance", "trip_distance" in t);
    check("trip has pickup_zone_id", "pickup_zone_id" in t);
    check("trip has dropoff_zone_id", "dropoff_zone_id" in t);
    check("trip has passenger_count", "passenger_count" in t);
    check("fare_amount is a number", typeof t.fare_amount === "number");
    check("trip_distance is positive", t.trip_distance > 0);
  }

  const p2 = await get("/trips?page=2&limit=10");
  check("page 2 status 200", p2.status === 200);
  check("page 2 returns correct page number", p2.body.page === 2);
  check("page 2 honours limit", p2.body.data.length <= 10);
  check("page 2 total matches page 1 total", p2.body.total === r.body.total);
}

async function tripsFilters() {
  console.log("\n/trips — filters");

  const borough = await get("/trips?borough=Manhattan&limit=20");
  check("borough filter 200", borough.status === 200);
  check("borough filter returns array", Array.isArray(borough.body.data));

  const fare = await get("/trips?fareMin=25&limit=20");
  check("fareMin filter 200", fare.status === 200);
  if (fare.body.data.length > 0) {
    check(
      "all returned fares >= fareMin",
      fare.body.data.every((t) => t.fare_amount >= 25)
    );
  }

  const time = await get("/trips?timeOfDay=evening&limit=20");
  check("timeOfDay filter 200", time.status === 200);
  check("timeOfDay returns array", Array.isArray(time.body.data));

  const date = await get("/trips?startDate=2024-01-01&endDate=2024-01-15&limit=20");
  check("date range filter 200", date.status === 200);

  const empty = await get("/trips?startDate=1999-01-01&endDate=1999-01-02");
  check("out-of-range date returns empty", empty.body.total === 0 || empty.body.data.length === 0);

  const multi = await get("/trips?borough=Manhattan&borough=Queens&limit=20");
  check("multiple boroughs 200", multi.status === 200);
  check("multiple boroughs returns array", Array.isArray(multi.body.data));
}

async function zones() {
  console.log("\n/zones");

  const r = await get("/zones");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));
  check("at least one zone", r.body.data.length > 0);

  if (r.body.data.length > 0) {
    const z = r.body.data[0];
    check("zone has zone_id", "zone_id" in z);
    check("zone has zone_name", "zone_name" in z);
    check("zone has borough", "borough" in z);
    check("zone_id is a number", typeof z.zone_id === "number");
  }
}

async function cityOverview() {
  console.log("\n/analytics/city-overview");

  const r = await get("/analytics/city-overview");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));
  check("one row returned", r.body.data.length >= 1);

  if (r.body.data.length > 0) {
    const row = r.body.data[0];
    check("has total_trips", "total_trips" in row);
    check("has average_fare", "average_fare" in row);
    check("has average_distance", "average_distance" in row);
    check("total_trips is positive", row.total_trips > 0);
    check("average_fare is positive", parseFloat(row.average_fare) > 0);
  }
}

async function topRoutes() {
  console.log("\n/analytics/top-routes");

  const r = await get("/analytics/top-routes");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));
  check("at most 10 routes", r.body.data.length <= 10);

  if (r.body.data.length > 0) {
    const row = r.body.data[0];
    check("has pickup_zone_id", "pickup_zone_id" in row);
    check("has dropoff_zone_id", "dropoff_zone_id" in row);
    check("has trip_count", "trip_count" in row);
  }

  if (r.body.data.length > 1) {
    const counts = r.body.data.map((d) => Number(d.trip_count));
    const descending = counts.every((v, i) => i === 0 || v <= counts[i - 1]);
    check("sorted descending by trip_count", descending);
  }

  const filtered = await get("/analytics/top-routes?borough=Bronx");
  check("borough filter 200", filtered.status === 200);
  check("borough filter returns array", Array.isArray(filtered.body.data));
}

async function heatMap() {
  console.log("\n/analytics/heat-map");

  const r = await get("/analytics/heat-map");
  check("status 200", r.status === 200);
  check("response is array", Array.isArray(r.body));
  check("has borough entries", r.body.length > 0);

  if (r.body.length > 0) {
    const b = r.body[0];
    check("entry has name", "name" in b);
    check("entry has hours object", typeof b.hours === "object");
    check("hours has 24 keys", Object.keys(b.hours).length === 24);

    const h = b.hours[0];
    check("hour entry has trips", "trips" in h);
    check("hour entry has passengers", "passengers" in h);
    check("trips is a number", typeof h.trips === "number");
  }

  const known = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
  const names = r.body.map((b) => b.name);
  check("no unknown boroughs in response", names.every((n) => known.includes(n)));

  const filtered = await get("/analytics/heat-map?borough=Queens");
  check("borough filter 200", filtered.status === 200);
}

async function timeSeries() {
  console.log("\n/analytics/time-series");

  const r = await get("/analytics/time-series");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));
  check("has entries", r.body.data.length > 0);

  if (r.body.data.length > 0) {
    const entry = r.body.data[0];
    check("entry has day", "day" in entry);
    check("entry has trip_count", "trip_count" in entry);
  }

  if (r.body.data.length > 1) {
    const days = r.body.data.map((d) => String(d.day));
    const ascending = days.every((d, i) => i === 0 || d >= days[i - 1]);
    check("days in ascending order", ascending);
  }
}

async function zoneStats() {
  console.log("\n/analytics/zone-stats");

  const missing = await get("/analytics/zone-stats");
  check("missing zone_id returns 400", missing.status === 400);

  const r = await get("/analytics/zone-stats?zone_id=1");
  check("valid zone_id returns 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));

  if (r.body.data.length > 0) {
    const row = r.body.data[0];
    check("has total_trips", "total_trips" in row);
    check("has avg_fare", "avg_fare" in row);
    check("has avg_distance", "avg_distance" in row);
  }
}

async function filteredStats() {
  console.log("\n/analytics/filtered-stats");

  const r = await get("/analytics/filtered-stats");
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);

  const d = r.body.data;
  check("has total_trips", d && "total_trips" in d);
  check("has avg_fare", d && "avg_fare" in d);
  check("has avg_distance", d && "avg_distance" in d);
  check("total_trips is positive", d && d.total_trips > 0);

  const borough = await get("/analytics/filtered-stats?borough=Staten Island");
  check("borough filter 200", borough.status === 200);

  if (borough.body.data && d) {
    check(
      "filtered count <= unfiltered count",
      borough.body.data.total_trips <= d.total_trips
    );
  }
}

async function anomalies() {
  console.log("\n/analytics/anomalies");

  const r = await get("/analytics/anomalies");
  check("status 200", r.status === 200);
  check("has summary", r.body.summary !== undefined);
  check("has speedAnomalies", Array.isArray(r.body.speedAnomalies));
  check("has fareAnomalies", Array.isArray(r.body.fareAnomalies));
  check("has thresholds", r.body.thresholds !== undefined);

  const s = r.body.summary;
  check("summary has totalTripsAnalyzed", "totalTripsAnalyzed" in s);
  check("summary has totalAnomalies", "totalAnomalies" in s);
  check("summary has speedTooFast", "speedTooFast" in s);
  check("summary has speedTooSlow", "speedTooSlow" in s);
  check("summary has fareTooHigh", "fareTooHigh" in s);
  check("summary has fareTooLow", "fareTooLow" in s);
  check(
    "totalAnomalies equals speed + fare array lengths",
    s.totalAnomalies === r.body.speedAnomalies.length + r.body.fareAnomalies.length
  );
  check("analyzed at least 1000 trips", s.totalTripsAnalyzed >= 1000);

  if (r.body.speedAnomalies.length > 0) {
    const a = r.body.speedAnomalies[0];
    check("speed anomaly has trip_id", "trip_id" in a);
    check("speed anomaly has zScore", "zScore" in a);
    check("speed anomaly has anomalyType", "anomalyType" in a);
    check("speed anomaly has reason", "reason" in a);
    check("speed anomaly type is valid",
      a.anomalyType === "speed_too_fast" || a.anomalyType === "speed_too_slow"
    );
  }

  if (r.body.fareAnomalies.length > 0) {
    const a = r.body.fareAnomalies[0];
    check("fare anomaly has pickup_zone_name", "pickup_zone_name" in a);
    check("fare anomaly type is valid",
      a.anomalyType === "fare_too_high" || a.anomalyType === "fare_too_low"
    );
  }
}

async function customFilter() {
  console.log("\n/analytics/custom-filter (POST)");

  const r = await post("/analytics/custom-filter", { fare_min: 10, fare_max: 40 });
  check("status 200", r.status === 200);
  check("success true", r.body.success === true);
  check("data is array", Array.isArray(r.body.data));

  if (r.body.data.length > 0) {
    check(
      "all fares within range",
      r.body.data.every((t) => t.fare_amount >= 10 && t.fare_amount <= 40)
    );
  }

  const noBody = await post("/analytics/custom-filter", {});
  check("empty body returns 200", noBody.status === 200);
  check("empty body returns array", Array.isArray(noBody.body.data));

  const zoneOnly = await post("/analytics/custom-filter", { pickup_zone: 1 });
  check("zone-only filter returns 200", zoneOnly.status === 200);
}

async function run() {
  console.log("=== API Tests ===");
  console.log("Target:", BASE, "\n");

  try {
    await tripsBasic();
    await tripsFilters();
    await zones();
    await cityOverview();
    await topRoutes();
    await heatMap();
    await timeSeries();
    await zoneStats();
    await filteredStats();
    await anomalies();
    await customFilter();
  } catch (err) {
    console.error("\nConnection failed:", err.message);
    console.error("Start the backend with: cd backend && npm run dev");
    process.exit(1);
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
