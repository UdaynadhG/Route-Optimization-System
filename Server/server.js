// server.js
const express = require("express");
const mongoose = require("mongoose");
const expressasynchandler = require("express-async-handler");
const authenticate = require('./middleware/verifyToken');
const calculateRoute = require("./services/routeService");
const cors = require('cors');
const app = express();
require("dotenv").config();
app.use(cors({
  origin: "https://route-optimization-system-one.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const port = process.env.PORT || 4000;

let source = {}

let stops = [
];

let calculatedRoute = [];

app.post('/add-stop', (req, res) => {
    const newStop = req.body;
    
    if (!newStop.lat || !newStop.lng) {
        return res.status(400).json({ message: "Latitude and Longitude are required" });
    }

    stops.push(newStop);
    res.status(201).json({
        message: "Stop added",
        stops
    });
});

app.post('/set-src', (req, res) => {
    const { SRCname, lat, lng } = req.body;
    if (!SRCname || !lat || !lng) {
        return res.status(400).json({ message: "Source name and coordinates required" });
    }
    source = {
        name: SRCname,
        lat: Number(lat), 
        lng: Number(lng)
    };
    res.json({
        message: "Source set successfully",
        source
    });
});

// REMOVE STOP
app.delete('/del-stop/:id', (req, res) => {
    const removeStopId = req.params.id;
    const index = stops.findIndex(stop => String(stop.id) === String(removeStopId));
    if (index === -1) {
        return res.status(404).json({ message: "Stop not found" });
    }
    stops.splice(index, 1);
    res.json({
        message: "Stop removed",
        stops
    });
});

// RESET
app.post('/reset', (req, res) => {
    source = { name: "", lat: null, lng: null }; 
    stops.length = 0;   
    res.json({
        message: "Reset successful"
    });
});

// GET ROUTE
app.get('/get-route', authenticate, expressasynchandler(async(req, res) => {
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
        source: source,
        stops: stops,
        route: resultRoutes 
    });
}));

app.get('/get-stops', expressasynchandler((req, res) => {
    res.send({ payload: stops });
}));

app.get('/route', (req, res) => {
    res.json({
        source: source,        
        stops: stops,          
        route: calculatedRoute 
    });
});
// Error handler
app.use((err, req, res, next) => {
  console.log("err object in express error handle: ", err);
  res.status(500).send({ message: err.message });
});

// DB CONNECTION & SERVER START
mongoose.connect(process.env.DBURL)
.then(() => {
    console.log("Connected to MongoDB");
    app.listen(3000, () => console.log("Server running on port 3000"));
})
.catch(err => console.error(err));

const Userapi = require("./APIs/userAPIs");
app.use("/user-auth", Userapi);
