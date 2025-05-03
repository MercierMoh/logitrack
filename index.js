require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// CRUD endpoints for locations
app.get('/api/locations', async (req, res) => {
  const { data, error } = await supabase.from('locations').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CRUD endpoints for vehicles
app.get('/api/vehicles', async (req, res) => {
  const { data, error } = await supabase.from('vehicles').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CRUD endpoints for drivers
app.get('/api/drivers', async (req, res) => {
  const { data, error } = await supabase.from('drivers').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CRUD endpoints for convoyeurs
app.get('/api/convoyeurs', async (req, res) => {
  const { data, error } = await supabase.from('convoyeurs').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /navettes
app.post('/api/navettes', async (req, res) => {
  try {
    const { 
      vehicle_id, 
      driver_id, 
      convoyeur_id, 
      start_time, 
      end_time, 
      route, 
      speed_kmh 
    } = req.body;

    // Validate routing rules
    const errors = [];
    
    // Check for merchandise code rules
    const merchandiseCodes = new Set();
    route.forEach(step => {
      if (step.out_types) merchandiseCodes.addAll(step.out_types);
      if (step.in_types) merchandiseCodes.addAll(step.in_types);
    });

    for (const code of merchandiseCodes) {
      if (code === '19') {
        const step = route.find(s => s.out_types?.includes('19'));
        if (!step) {
          errors.push('Code 19 must have an OUT step at HUB Sétif');
          continue;
        }
        const location = await supabase
          .from('locations')
          .select('name')
          .eq('id', step.location_id)
          .single();
        if (location.data.name !== 'HUB Sétif') {
          errors.push('Code 19 must OUT at HUB Sétif');
        }
      }
      if (['28', '34'].includes(code)) {
        const step = route.find(s => s.out_types?.includes(code));
        if (!step) {
          errors.push(`Code ${code} must have an OUT step at HUB BBA`);
          continue;
        }
        const location = await supabase
          .from('locations')
          .select('name')
          .eq('id', step.location_id)
          .single();
        if (location.data.name !== 'HUB BBA') {
          errors.push(`Code ${code} must OUT at HUB BBA`);
        }
      }
      if (['Est', 'Centre', 'Sud', 'Ouest'].includes(code)) {
        const step = route.find(s => s.out_types?.includes(code));
        if (!step) {
          errors.push(`Code ${code} must have an OUT step`);
          continue;
        }
        const location = await supabase
          .from('locations')
          .select('name')
          .eq('id', step.location_id)
          .single();
        if (location.data.name === 'HUB Constantine' && new Date(start_time).getHours() >= 21) {
          errors.push(`Code ${code} cannot OUT at HUB Constantine after 21:00`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Calculate ETA using haversine formula
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const fromLoc = await supabase
        .from('locations')
        .select('latitude, longitude')
        .eq('id', route[i].location_id)
        .single();
      const toLoc = await supabase
        .from('locations')
        .select('latitude, longitude')
        .eq('id', route[i + 1].location_id)
        .single();

      const lat1 = fromLoc.data.latitude;
      const lon1 = fromLoc.data.longitude;
      const lat2 = toLoc.data.latitude;
      const lon2 = toLoc.data.longitude;

      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }

    const etaMinutes = (totalDistance / speed_kmh) * 60;

    // Create navette
    const { data: navette, error: navetteError } = await supabase
      .from('navettes')
      .insert([
        {
          vehicle_id,
          driver_id,
          convoyeur_id,
          start_time,
          end_time
        }
      ])
      .select()
      .single();

    if (navetteError) throw navetteError;

    // Create navette routes
    const routes = route.map((step, index) => ({
      navette_id: navette.id,
      step_order: index,
      location_id: step.location_id,
      out_types: step.out_types,
      in_types: step.in_types
    }));

    await supabase.from('navette_routes').insert(routes);

    res.json({ 
      navette_id: navette.id,
      eta_minutes: etaMinutes,
      total_distance: totalDistance
    });

  } catch (error) {
    console.error('Error creating navette:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
