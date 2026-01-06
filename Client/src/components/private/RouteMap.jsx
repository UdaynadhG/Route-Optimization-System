import axios from 'axios';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './RouteMap.css'

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useNavigate } from 'react-router-dom';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center }) {
    const map = useMap();
    map.setView(center);
    return null;
}

function RouteMap() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roadPath, setRoadPath] = useState([]); 
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/get-route`, {
                    headers: {
                        Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
                    },
                });
                console.log("Backend Response:", res.data);
                setData(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching route:", err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchRoute();
    }, []);

    useEffect(() => {
        if (!data) return;

        const routeArray = data.route || data.routes || [];
        if (routeArray.length === 0) return;

        // Create a lookup map for coordinates
        const coordMap = new Map();
        if (data.source) coordMap.set(data.source.name, [data.source.lat, data.source.lng]);
        if (data.stops) data.stops.forEach(s => coordMap.set(s.name, [s.lat, s.lng]));

        // Get the ordered list of coordinates (Waypoints)
        const waypoints = routeArray
            .map(name => coordMap.get(name))
            .filter(c => c !== undefined);

        // If we have at least 2 points, fetch the road path
        if (waypoints.length >= 2) {
            const fetchOSRMPath = async () => {
                try {
                    // OSRM requires coordinates in "Longitude,Latitude" format
                    // waypoints are currently [Lat, Lng]
                    const coordinatesString = waypoints
                        .map(pt => `${pt[1]},${pt[0]}`) 
                        .join(';');

                    // Request geometry=geojson to get the shape line
                    const url = `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;
                    
                    const response = await axios.get(url);

                    if (response.data.routes && response.data.routes.length > 0) {
                        // OSRM returns [Lng, Lat], we need [Lat, Lng] for Leaflet
                        const geoJsonCoords = response.data.routes[0].geometry.coordinates;
                        const leafLetCoords = geoJsonCoords.map(c => [c[1], c[0]]);
                        setRoadPath(leafLetCoords);
                    }
                } catch (err) {
                    console.error("Error fetching OSRM path:", err);
                    // Fallback: If OSRM fails, just draw straight lines between waypoints
                    setRoadPath(waypoints);
                }
            };
            fetchOSRMPath();
        } else {
            setRoadPath([]);
        }

    }, [data]);

    if (loading) return <div className="p-5 text-center">Loading Route...</div>;
    if (error) return <div className="p-5 text-center text-danger">Error: {error}</div>;
    if (!data) return <div className="p-5 text-center">No data found</div>;

    const routeArray = data.route || data.routes || [];
    const center = data.source ? [data.source.lat, data.source.lng] : [17.3850, 78.4867];

    const handleLogOut = async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/user-auth/logout`, {
                data: { token: refreshToken },  
            });
            navigate('/');
        } catch (err) {
            console.error("Logout failed:", err.response?.data || err.message);
        }
    };

    return (
        <div className='mapbg'>
            <div className="d-flex justify-content-between align-items-center">
                <div className="logo-section">
                <img src="/vite.svg" alt="logo" onClick={() => navigate("/")}
                    style={{ cursor: "pointer" }}/>
                <span className="app-name" onClick={() => navigate("/")}
                    style={{ cursor: "pointer" }}>Route Optimizer</span>
                </div>
                <div className='me-5'>
                    <button className="btn btn-danger" onClick={handleLogOut}>LogOut</button>
                </div> 
            </div>
        <div className="container mt-4">
            {/* --- TOP SECTION: ROUTE SEQUENCE --- */}
            <div className="card mb-4 shadow-sm">
                <div className="card-body">
                    <h4 className="card-title mb-3">Optimized Route Sequence</h4>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        {routeArray.map((placeName, index) => (
                            <div key={index} className="d-flex align-items-center">
                                <span className={`badge p-2 ${index === 0 ? 'bg-success' : 'bg-primary'}`} 
                                      style={{fontSize: '1rem'}}>
                                    {index + 1}. {placeName}
                                </span>
                                {index < routeArray.length - 1 && (
                                    <span className="ms-2 me-2 text-muted" style={{fontSize: '1.5rem'}}>
                                        →
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SECTION: MAP WITH ROAD DIRECTIONS --- */}
            <div className="card shadow-sm" style={{ height: '500px', overflow: 'hidden' }}>
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={center} />
                    
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Source Marker */}
                    {data.source && (
                        <Marker position={[data.source.lat, data.source.lng]}>
                            <Popup><b>Start:</b> {data.source.name}</Popup>
                        </Marker>
                    )}

                    {/* Stop Markers */}
                    {data.stops && data.stops.map((stop) => (
                        <Marker key={stop.id || Math.random()} position={[stop.lat, stop.lng]}>
                            <Popup>
                                <b>Stop:</b> {stop.name} <br/>
                                Priority: {stop.priority}
                            </Popup>
                        </Marker>
                    ))}

                    {/* THE ROAD PATH (Blue Line following roads) */}
                    <Polyline 
                        positions={roadPath} 
                        color="blue" 
                        weight={5} 
                        opacity={0.8} 
                    />
                </MapContainer>
            </div>
        </div>
        </div>
    );
}

export default RouteMap;
