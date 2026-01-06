const axios = require("axios");
require("dotenv").config();

const threshold = 300; // seconds
const mp = new Map();


/* =======================
   TIME PROVIDER (ORS)
======================= */

async function getTime(src, dest) {
  try {
    const url = `http://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dest.lng},${dest.lat}?overview=false`;

    const response = await axios.get(url);

    if (response.data.code !== "Ok" || !response.data.routes || response.data.routes.length === 0) {
      throw new Error("No route found");
    }
    //console.log(Math.round(response.data.routes[0].duration));
    return Math.round(response.data.routes[0].duration);
  } catch (err) {
    console.error("OSRM Error:", err.message);
    throw new Error("Route calculation failed");
  }
}
/* =======================
   PRECOMPUTE ALL TIMES
======================= */
async function calculateTimes(source, stops) {
    const all = [source, ...stops];

    for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
            const x = all[i];
            const y = all[j];

            const time = await getTime(x, y);

            mp.set(`${x.name}|${y.name}`, time);
            mp.set(`${y.name}|${x.name}`, time);
        }
    }
}

/* =======================
   PENALTY HANDLING
======================= */
function getPenaltyTime(priority) {
    const p = priority.toUpperCase();
    if (p === "HIGH") return 0;
    if (p === "MEDIUM") return 5 * 60;
    return 15 * 60;
}

/* =======================
   FIND NEAREST STOP
======================= */
async function findNearest(srcName, stops, usePenalty) {
    let best = null;

    for (let i = 0; i < stops.length; i++) {
        let time = mp.get(`${srcName}|${stops[i].name}`);

        if (usePenalty) {
            time += getPenaltyTime(stops[i].priority);
        }

        if (!best || time < best.time) {
            best = { time, index: i };
        }
    }
    return best;
}

/* =======================
   NEARBY STOPS LOGIC
======================= */
async function nearByStops(srcName, destName, stops) {
    const base = mp.get(`${srcName}|${destName}`);
    const idxs = [];

    for (let i = 0; i < stops.length; i++) {
        const extra =
            mp.get(`${srcName}|${stops[i].name}`) +
            mp.get(`${stops[i].name}|${destName}`) -
            base;

        if (extra <= threshold) idxs.push(i);
    }

    idxs.sort(
        (a, b) =>
            mp.get(`${srcName}|${stops[a].name}`) -
            mp.get(`${srcName}|${stops[b].name}`)
    );

    return idxs;
}

/* =======================
   MAIN ROUTE FUNCTION
======================= */
async function calculateRoute(source, stops) {
    mp.clear();

    await calculateTimes(source, stops);

    let extremeStops = [];
    let normalStops = [];
    let route = [source.name];

    for (const s of stops) {
        if (s.priority === "EXTREME") extremeStops.push(s);
        else normalStops.push(s);
    }

    let currSrc = source.name;

    /* ===== EXTREME PHASE ===== */
    while (extremeStops.length) {
        const currDest = await findNearest(currSrc, extremeStops, false);
        const dest = extremeStops[currDest.index];

        const nearStops = await nearByStops(currSrc, dest.name, normalStops);
        nearStops.sort((a, b) => b - a);

        for (const idx of nearStops) {
            route.push(normalStops[idx].name);
            normalStops.splice(idx, 1);
        }

        route.push(dest.name);
        extremeStops.splice(currDest.index, 1);
        currSrc = dest.name;
    }

    /* ===== NORMAL PHASE ===== */
    while (normalStops.length) {
        const currDest = await findNearest(currSrc, normalStops, true);
        const dest = normalStops[currDest.index];

        const nearStops = await nearByStops(currSrc, dest.name, normalStops);
        nearStops.sort((a, b) => b - a);

        for (const idx of nearStops) {
            route.push(normalStops[idx].name);
            normalStops.splice(idx, 1);
        }

        route.push(dest.name);
        normalStops.splice(currDest.index, 1);
        currSrc = dest.name;
    }

    return route;
}

module.exports = calculateRoute;
