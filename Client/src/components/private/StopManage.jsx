import './StopManage.css';
import '../public/Login.css';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState} from 'react';
import axios from 'axios';

const AddressAutocomplete = ({ placeholder, value, onChange, onSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length > 2 && showDropdown) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`;
          const res = await axios.get(url);
          setSuggestions(res.data);
        } catch (err) {
          console.error("Geocoding error:", err);
        }
      } else {
        setSuggestions([]);
      }
    }, 500); 

    return () => clearTimeout(timer);
  }, [value, showDropdown]);

  const handleSelect = (place) => {
    onSelect({
      name: place.display_name.split(",")[0], 
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} className=''>
      <input
        className='form-control'
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {suggestions.length > 0 && showDropdown && (
        <ul className="list-group" style={{
          position: 'absolute',
          zIndex: 1000,
          width: '100%',
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '-10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}>
          {suggestions.map((place) => (
            <li
              key={place.place_id}
              className="list-group-item list-group-item-action"
              style={{ cursor: 'pointer', fontSize: '14px', color: 'black' }}
              onClick={() => handleSelect(place)}
            >
              {place.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

function StopManage() {
  const navigate = useNavigate();
  const [viewStops, setViewStops] = useState(false);
  const [stops, setStops] = useState([]);
  const [infoPriority, setInfoPriority] = useState(false);
  
  // Source States
  const [startPoint, setStartPoint] = useState("");
  const [startCoords, setStartCoords] = useState({ lat: null, lng: null });
  
  // Stop States
  const [stopPoint, setStopPoint] = useState("");
  const [stopCoords, setStopCoords] = useState({ lat: null, lng: null });
  
  const [priority, setPriority] = useState("");
  const [isEditingSource, setIsEditingSource] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchStops = async () => {
      const url = `${import.meta.env.VITE_API_URL}/get-stops`;
      try {
        const response = await axios.get(url);
        setStops(response.data.payload || []);
      } catch (err) {
        console.error("Error fetching stops:", err.response?.data || err.message);
      }
    };
    fetchStops();
  }, [viewStops]); 

  const removeStop = async(id) => {
    setStops(prev => prev.filter(stop => stop.id !== id));
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/del-stop/${id}`);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleSource = async (e) => {
    e.preventDefault();
  
    if (!startPoint || !startCoords.lat) {
      alert("Please select a valid starting point from the list");
      return;
    }

    try {
      const payload = {
        SRCname: startPoint,
        lat: startCoords.lat,
        lng: startCoords.lng
      };
      
      await axios.post(`${import.meta.env.VITE_API_URL}/set-src`, payload);
      setIsEditingSource(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStop = async (e) => {
    e.preventDefault();

    if (!stopPoint || !priority || !stopCoords.lat) {
      alert("Please select a valid stop from the list and choose priority");
      return;
    }

    const found = stops.filter((stop) => stop.name === stopPoint);

    if (found.length > 0) {
      alert("This stop has been already added");
      return;
    }
    const existingIds = stops.map(obj => obj.id);
    let id;
    do {
      id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    } while (existingIds.includes(id));

    const newStop = {
      id: id,
      name: stopPoint,
      lat: stopCoords.lat,
      lng: stopCoords.lng,
      priority
    };

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/add-stop`, newStop);
      setStops(prev => [...prev, newStop]);
    
      setStopPoint("");
      setStopCoords({ lat: null, lng: null });
      setPriority("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetRoute = async (e) => {
    e.preventDefault();
    if(isEditingSource === true){
      alert("Please confirm your Source first");
      return;
    }
    if(stops.length === 0){
      alert("Enter at least one stop");
      return;
    }
    const url = `${import.meta.env.VITE_API_URL}/get-route`;
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
        },
      });
      if (response.status === 200) {
        console.log(response.data);
        navigate("/RouteMap");
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) {
            navigate("/auth?mode=login");
            return;
          }
          const refreshRes = await axios.post(`${import.meta.env.VITE_API_URL}/user-auth/token`, { token: refreshToken });
          sessionStorage.setItem("accessToken", refreshRes.data.accessToken);

          const retryRes = await axios.get(url, {
            headers: { Authorization: `Bearer ${refreshRes.data.accessToken}` },
          });

          if (retryRes.status === 200) {
            navigate("/RouteMap");
          }
        } catch (refreshErr) {
          navigate("/auth?mode=login");
          alert("Session expired. Please login again.");
        }
      } else {
        console.error(err);
      }
    }
  };

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
    <div className="stop-box">
      {/* LOGO */}
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

      <div className='d-flex cont'>
        {infoPriority && (
          <div className="box pt-5 ps-4 pe-4 d-flex flex-column align-items-center stops-container"
                style={{
                  maxHeight: "300px",   
                  overflowY: "auto",   
                  width: "100%",
                  maxWidth: "520px"
                }}
              >
            <div className="priority-info mt-4">
              <h3 className='text-center mb-5'>How Priority Affects Routing</h3>
              <ul>
                <li className='mb-3'>
                  <span className="tag extreme">EXTREME</span>
                  <span>
                    Mandatory stop. Nearby stops are allowed only if they add
                    <b> ≤ 5 minutes</b> delay.
                  </span>
                </li>

                <li className='mb-3'>
                  <span className="tag high">HIGH</span>
                  <span>
                    Very important. Minor delay allowed if it improves overall route.
                  </span>
                </li>

                <li className='mb-3'>
                  <span className="tag medium">MEDIUM</span>
                  <span>
                    Moderate flexibility. Can be delayed more if nearby stops reduce travel time.
                  </span>
                </li>

                <li className='mb-4'>
                  <span className="tag low">LOW</span>
                  <span>
                    Flexible stop. Can be delayed significantly for route optimization.
                  </span>
                </li>
              </ul>

              <div className="threshold-note">
                ⏱️ <b>Note:</b> Nearby stops are merged only if extra delay is within
                <b> 5 minutes</b>.
              </div>
            </div>

          </div>
        )}
        <div className="box">
          <form className="form mt-5">

            {isEditingSource ? (
              <>
                <AddressAutocomplete 
                  placeholder="Choose a starting point"
                  value={startPoint}
                  onChange={(val) => setStartPoint(val)}
                  onSelect={(data) => {
                    setStartPoint(data.name);
                    setStartCoords({ lat: data.lat, lng: data.lng });
                  }}
                />
                
                <button 
                  className="btn btn-primary mt-2 mb-2" 
                  onClick={handleSource}
                >
                  Add Source
                </button>
              </>
            ) : (
              <div className="d-flex align-items-center mb-3 justify-content-between">
                <span style={{ fontWeight: "bold", marginRight: "10px" }}>
                  Source: {startPoint}
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setIsEditingSource(true)}
                >
                  Edit
                </button>
              </div>
            )}

            <AddressAutocomplete 
              placeholder="Choose a stop point"
              value={stopPoint}
              onChange={(val) => setStopPoint(val)}
              onSelect={(data) => {
                setStopPoint(data.name);
                setStopCoords({ lat: data.lat, lng: data.lng });
              }}
            />

            <div>Select priority:</div>
            <div className="d-flex flex-row justify-content-between">
              <label>
                <input type="radio" name="priority" value="EXTREME" checked={priority === "EXTREME"} onChange={(e) => setPriority(e.target.value)} /> Extreme
              </label>
              <label>
                <input type="radio" name="priority" value="HIGH" checked={priority === "HIGH"} onChange={(e) => setPriority(e.target.value)} /> High
              </label>
              <label>
                <input type="radio" name="priority" value="MEDIUM" checked={priority === "MEDIUM"} onChange={(e) => setPriority(e.target.value)} /> Medium
              </label>
              <label>
                <input type="radio" name="priority" value="LOW" checked={priority === "LOW"} onChange={(e) => setPriority(e.target.value)} /> Low
              </label> 
            </div>
            <button className="btn btn-primary mt-2" onClick={handleAddStop}>Add Stop</button>
            <button
              className={`btn mt-2 ${viewStops ? "btn-secondary" : "btn-primary"}`}
              type="button"
              onClick={() => setViewStops(prev => !prev)}
            >
              {viewStops ? "Hide Added Stops" : "View Added Stops"}
            </button>
            <button className="btn btn-primary mt-2"  onClick={handleGetRoute}>Get Route</button>
            <button className="btn btn-outline-info btn-sm mt-1" type="button" onClick={() => setInfoPriority(prev => !prev)}>How Priority Affects the Routing</button>
          </form>
        </div>

        {viewStops && (
          <div className="box pt-4 d-flex flex-column align-items-center stops-container"
                style={{
                  maxHeight: "300px",   
                  overflowY: "auto",   
                  width: "100%",
                  maxWidth: "520px"
                }}
              >
            {stops.map(stop => (
              <div
                key={stop.id}
                className="d-flex align-items-center mini-box"
                style={{
                  width: "100%",
                  maxWidth: "500px",
                  border: "1px solid #ccc",
                  padding: "10px 15px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  backgroundColor: "#1e1e1e",
                  color: "#fff",
                  fontFamily: "'Comic Sans MS', cursive, sans-serif",
                  justifyContent: "flex-start",
                  gap: "20px"
                }}
              >
                <div
                  style={{
                    color: "#fff",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    minWidth: "90px",
                    textAlign: "center"
                  }}
                >
                  {stop.priority}
                </div>

                <div style={{ flexGrow: 1, fontSize: "16px", paddingLeft: "65px" }}>
                  {stop.name}
                </div>

                <button
                  className="btn btn-danger"
                  style={{
                    color: "#fff",
                    borderRadius: "6px",
                    fontWeight: "bold"
                  }}
                  onClick={() => removeStop(stop.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}

export default StopManage;
