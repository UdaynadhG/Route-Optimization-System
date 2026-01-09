// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const expressAsyncHandler = require("express-async-handler");

const authenticate = require("./middleware/verifyToken");
const calculateRoute = require("./services/routeService");
const Userapi = require("./APIs/userAPIs");

const app = express();

/* =========================
   CORS CONFIG (ONLY HERE)
   ========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://route-optimization-system-one.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

/* =========================
   APP STATE
   ========================= */
let source = {};
let stops = [];
let calculatedRoute = [];

/* =========================
   ROUTES
   ========================= */

// ADD STOP
app.post("/add-stop", (req, res) => {
  const newStop = req.body;

  if (!newStop.lat || !newStop.lng) {
    return res.status(400).json({ message: "Latitude and Longitude are required" });
  }

  stops.push(newStop);
  res.status(201).json({ message: "Stop added", stops });
});

// SET SOURCE
app.post("/set-src", (req, res) => {
  const { SRCname, lat, lng } = req.body;

  if (!SRCname || !lat || !lng) {
    return res.status(400).json({ message: "Source name and coordinates required" });
  }

  source = {
    name: SRCname,
    lat: Number(lat),
    lng: Number(lng)
  };

  res.json({ message: "Source set successfully", source });
});

// DELETE STOP
app.delete("/del-stop/:id", (req, res) => {
  const removeStopId = req.params.id;
  const index = stops.findIndex(stop => String(stop.id) === String(removeStopId));

  if (index === -1) {
    return res.status(404).json({ message: "Stop not found" });
  }

  stops.splice(index, 1);
  res.json({ message: "Stop removed", stops });
});

// RESET
app.post("/reset", (req, res) => {
  source = {};
  stops = [];
  calculatedRoute = [];

  res.json({ message: "Reset successful" });
});

// GET ROUTE (Protected)
app.get(
  "/get-route",
  authenticate,
  expressAsyncHandler(async (req, res) => {
    if (!source.lat || !source.lng) {
      res.status(400);
      throw new Error("Source point is not set");
    }

    if (stops.length === 0) {
      res.status(400);
      throw new Error("No stops provided");
    }

    const resultRoutes = await calculateRoute(source, stops);
    calculatedRoute = [...resultRoutes];

    res.json({
      source,
      stops,
      route: resultRoutes
    });
  })
);

// GET STOPS
app.get("/get-stops", (req, res) => {
  res.json({ payload: stops });
});

// GET FINAL ROUTE
app.get("/route", (req, res) => {
  res.json({
    source,
    stops,
    route: calculatedRoute
  });
});

// USER AUTH ROUTES
app.use("/user-auth", Userapi);

/* =========================
   ERROR HANDLER
   ========================= */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(res.statusCode || 500).json({ message: err.message });
});

/* =========================
   DB + SERVER START
   ========================= */
mongoose
  .connect(process.env.DBURL)
  .then(() => {
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
