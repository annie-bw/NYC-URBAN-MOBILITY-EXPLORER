require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", routes);
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

app.listen(5000, () => console.log("Server running on port 5000"));
