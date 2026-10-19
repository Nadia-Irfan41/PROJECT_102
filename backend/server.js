const path = require("path");
const express = require("express");
const cors = require("cors");

const pool = require("./db");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);

// Serves the frontend, so http://localhost:5000 opens the Index page
app.use(express.static(path.join(__dirname, "..", "frontend")));

const PORT = process.env.PORT || 5000;
pool.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
