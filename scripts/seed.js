require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seed() {
  try {
    // Insert locations
    const locations = [
      { name: 'HUB Sétif', latitude: 36.175, longitude: 5.3167 },
      { name: 'HUB El Eulma', latitude: 36.505, longitude: 6.655 },
      { name: 'Chelghoum Laïd', latitude: 35.9167, longitude: 3.8333 },
      { name: 'HUB Constantine', latitude: 36.375, longitude: 6.6 },
      { name: 'HUB BBA', latitude: 35.9167, longitude: 5.6167 },
      { name: 'HUB Algiers – Oued Smar', latitude: 36.775, longitude: 3.2167 }
    ];

    await supabase.from('locations').insert(locations);

    // Insert merchandise
    const merchandise = [
      { code: '19', description: 'Sétif Specific' },
      { code: '28', description: 'BBA Specific' },
      { code: '34', description: 'BBA Specific' },
      { code: 'Est', description: 'East Region' },
      { code: 'Centre', description: 'Central Region' },
      { code: 'Sud', description: 'South Region' },
      { code: 'Ouest', description: 'West Region' }
    ];

    await supabase.from('merchandise').insert(merchandise);

    // Insert vehicles
    const vehicles = [
      { model: 'Renault Midlum', plate_number: '4524' },
      { model: 'Hino 500', plate_number: '3336' },
      { model: 'HD78', plate_number: '810' },
      { model: 'HD120', plate_number: '860' }
    ];

    await supabase.from('vehicles').insert(vehicles);

    // Insert drivers
    const drivers = [
      { name: 'Ameur' },
      { name: 'Chibi' },
      { name: 'Yasser' },
      { name: 'Nabil' },
      { name: 'Hamza' },
      { name: 'Abdelghani' },
      { name: 'Kamel' },
      { name: 'Islam' }
    ];

    await supabase.from('drivers').insert(drivers);

    // Insert convoyeurs
    const convoyeurs = [
      { name: 'Mami' },
      { name: 'Lazhar' },
      { name: 'Kahla' },
      { name: 'Rafik' }
    ];

    await supabase.from('convoyeurs').insert(convoyeurs);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

seed();
