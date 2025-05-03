import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

function App() {
  const [locations, setLocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [convoyeurs, setConvoyeurs] = useState([]);
  const [routeSteps, setRouteSteps] = useState([{ location_id: '', out_types: [], in_types: [] }]);
  const [speed, setSpeed] = useState(60);
  const [unresolvedMerchandise, setUnresolvedMerchandise] = useState([]);
  const [routePolyline, setRoutePolyline] = useState([]);

  useEffect(() => {
    // Fetch all data on mount
    Promise.all([
      axios.get('/api/locations'),
      axios.get('/api/vehicles'),
      axios.get('/api/drivers'),
      axios.get('/api/convoyeurs')
    ]).then(([locationsRes, vehiclesRes, driversRes, convoyeursRes]) => {
      setLocations(locationsRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setConvoyeurs(convoyeursRes.data);
    });
  }, []);

  const addRouteStep = () => {
    setRouteSteps([...routeSteps, { location_id: '', out_types: [], in_types: [] }]);
  };

  const removeRouteStep = (index) => {
    if (routeSteps.length > 1) {
      const newSteps = [...routeSteps];
      newSteps.splice(index, 1);
      setRouteSteps(newSteps);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vehicle = vehicles[0]; // For demo, using first vehicle
    const driver = drivers[0];
    const convoyeur = convoyeurs[0];
    const now = new Date();
    const routeData = {
      vehicle_id: vehicle.id,
      driver_id: driver.id,
      convoyeur_id: convoyeur.id,
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 3600000).toISOString(),
      route: routeSteps,
      speed_kmh: speed
    };

    try {
      const response = await axios.post('/api/navettes', routeData);
      console.log('ETA:', response.data.eta_minutes, 'minutes');
      
      // Calculate route points for polyline
      const points = await Promise.all(
        routeSteps.map(async (step) => {
          const location = locations.find(l => l.id === step.location_id);
          return [location.latitude, location.longitude];
        })
      );
      setRoutePolyline(points);

      // Check for unresolved merchandise
      const allTypes = routeSteps.flatMap(step => [...step.out_types, ...step.in_types]);
      const uniqueTypes = [...new Set(allTypes)];
      const resolvedTypes = response.data.resolved_merchandise || [];
      const unresolved = uniqueTypes.filter(type => !resolvedTypes.includes(type));
      setUnresolvedMerchandise(unresolved);

    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[35, 5]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Locations markers */}
          {locations.map(location => (
            <Marker key={location.id} position={[location.latitude, location.longitude]}>
              <Popup>
                {location.name}<br/>
                Allowed Types: {location.allowed_types.join(', ')}
              </Popup>
            </Marker>
          ))}

          {/* Route polyline */}
          {routePolyline.length > 1 && (
            <Polyline positions={routePolyline} color="blue" />
          )}
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div style={{ width: '300px', padding: '20px' }}>
        <h2>Navette Creation</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>Speed (km/h):</label>
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              min="1"
            />
          </div>

          {routeSteps.map((step, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
              <button
                type="button"
                onClick={() => removeRouteStep(index)}
                style={{ float: 'right' }}
              >
                Remove
              </button>
              <h3>Step {index + 1}</h3>
              <select
                value={step.location_id}
                onChange={(e) => {
                  const newSteps = [...routeSteps];
                  newSteps[index].location_id = e.target.value;
                  setRouteSteps(newSteps);
                }}
              >
                <option value="">Select location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label>OUT Types:</label>
                  <select
                    multiple
                    value={step.out_types}
                    onChange={(e) => {
                      const newSteps = [...routeSteps];
                      newSteps[index].out_types = Array.from(e.target.selectedOptions).map(option => option.value);
                      setRouteSteps(newSteps);
                    }}
                  >
                    <option value="19">19</option>
                    <option value="28">28</option>
                    <option value="34">34</option>
                    <option value="Est">Est</option>
                    <option value="Centre">Centre</option>
                    <option value="Sud">Sud</option>
                    <option value="Ouest">Ouest</option>
                  </select>
                </div>
                <div>
                  <label>IN Types:</label>
                  <select
                    multiple
                    value={step.in_types}
                    onChange={(e) => {
                      const newSteps = [...routeSteps];
                      newSteps[index].in_types = Array.from(e.target.selectedOptions).map(option => option.value);
                      setRouteSteps(newSteps);
                    }}
                  >
                    <option value="19">19</option>
                    <option value="28">28</option>
                    <option value="34">34</option>
                    <option value="Est">Est</option>
                    <option value="Centre">Centre</option>
                    <option value="Sud">Sud</option>
                    <option value="Ouest">Ouest</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addRouteStep} style={{ marginBottom: '20px' }}>
            Add Step
          </button>

          <button type="submit">Create Navette</button>
        </form>

        {unresolvedMerchandise.length > 0 && (
          <div style={{ marginTop: '20px', backgroundColor: '#fee', padding: '10px' }}>
            <h3>Unresolved Merchandise:</h3>
            <ul>
              {unresolvedMerchandise.map(code => (
                <li key={code} style={{ color: 'red' }}>{code}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
