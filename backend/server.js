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

const { createIndexes } = require("./config/db");

const startServer = async () => {
  try {
    console.log("Initializing database...");
    await createIndexes();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
