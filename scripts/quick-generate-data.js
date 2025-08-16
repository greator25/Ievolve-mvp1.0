import { db } from '../server/db.js';
import { users, hotels, participants } from '../shared/schema.js';
import bcrypt from 'bcryptjs';
import { cleanupOldData } from './cleanup-data.js';

const quickGenerateData = async () => {
  console.log('🚀 Quick test data generation starting...');
  
  // Clean up first
  await cleanupOldData();
  
  // Districts and sports
  const districts = ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tirunelveli'];
  const sports = ['Athletics', 'Swimming', 'Basketball', 'Football', 'Cricket'];
  const hotelChains = ['ITC', 'Taj', 'Marriott', 'Hyatt', 'Radisson'];
  
  let mobileCounter = 9344200000; // Avoid admin number
  const getNextMobile = () => `+91${++mobileCounter}`;
  
  // 1. Create Admin
  console.log('👤 Creating admin...');
  const adminPassword = await bcrypt.hash('IevolveAdmin2025!', 10);
  await db.insert(users).values({
    name: 'System Administrator',
    email: 'admin@ievolve.com',
    password: adminPassword,
    mobileNumber: '+919344100312',
    role: 'admin',
    isActive: true
  });
  
  // 2. Create hotels with multiple instances and different date ranges
  console.log('🏨 Creating hotels with multiple instances...');
  const hotelPromises = [];
  
  // Create 5 unique hotels, each with 2-3 instances at different date ranges
  for (let hotelIndex = 0; hotelIndex < 5; hotelIndex++) {
    const baseHotelId = `HOTEL-${String(hotelIndex + 1).padStart(3, '0')}`;
    const hotelName = `${hotelChains[hotelIndex % hotelChains.length]} ${districts[hotelIndex % districts.length]}`;
    const location = districts[hotelIndex % districts.length];
    const district = districts[hotelIndex % districts.length];
    const address = `${hotelIndex + 1}, Anna Salai, ${district}`;
    const pincode = `600${String(hotelIndex).padStart(3, '0')}`;
    
    // Instance 1: September 1-15, 2025
    hotelPromises.push(db.insert(hotels).values({
      hotelId: baseHotelId,
      instanceCode: '1',
      hotelName,
      location,
      district,
      address,
      pincode,
      startDate: new Date(2025, 8, 1), // September 1, 2025
      endDate: new Date(2025, 8, 15), // September 15, 2025
      totalRooms: 100 + (hotelIndex * 20),
      occupiedRooms: 30 + (hotelIndex * 5),
      availableRooms: 70 + (hotelIndex * 15)
    }));
    
    // Instance 2: September 20-30, 2025 (different date range)
    hotelPromises.push(db.insert(hotels).values({
      hotelId: baseHotelId,
      instanceCode: '2',
      hotelName,
      location,
      district,
      address,
      pincode,
      startDate: new Date(2025, 8, 20), // September 20, 2025
      endDate: new Date(2025, 8, 30), // September 30, 2025
      totalRooms: 100 + (hotelIndex * 20),
      occupiedRooms: 25 + (hotelIndex * 4),
      availableRooms: 75 + (hotelIndex * 16)
    }));
    
    // Instance 3: October 5-20, 2025 (for first 3 hotels only)
    if (hotelIndex < 3) {
      hotelPromises.push(db.insert(hotels).values({
        hotelId: baseHotelId,
        instanceCode: '3',
        hotelName,
        location,
        district,
        address,
        pincode,
        startDate: new Date(2025, 9, 5), // October 5, 2025
        endDate: new Date(2025, 9, 20), // October 20, 2025
        totalRooms: 100 + (hotelIndex * 20),
        occupiedRooms: 40 + (hotelIndex * 6),
        availableRooms: 60 + (hotelIndex * 14)
      }));
    }
  }
  
  await Promise.all(hotelPromises);
  
  // 3. Create 5 coaches with user accounts
  console.log('🏃‍♂️ Creating 5 coaches...');
  const coachPromises = [];
  const coaches = [];
  
  for (let i = 0; i < 5; i++) {
    const coachId = `COACH-${String(i + 1).padStart(5, '0')}`;
    const name = `Coach ${i + 1}`;
    const mobile = getNextMobile();
    const sport = sports[i % sports.length];
    const district = districts[i % districts.length];
    
    // Create user
    coachPromises.push(db.insert(users).values({
      name: name,
      email: `coach${i + 1}@ievolve.com`,
      mobileNumber: mobile,
      role: 'coach',
      coachId: coachId,
      isActive: true
    }));
    
    // Create participant
    coachPromises.push(db.insert(participants).values({
      participantId: coachId,
      name: name,
      mobileNumber: mobile,
      role: 'coach',
      discipline: sport,
      district: district,
      teamName: `${district} ${sport} Team`,
      hotelId: `HOTEL-${String((i % 10) + 1).padStart(3, '0')}`,
      hotelName: `${hotelChains[i % hotelChains.length]} ${district}`,
      bookingStartDate: new Date(2025, 8, 1),
      bookingEndDate: new Date(2025, 8, 15),
      bookingReference: `BK-${coachId}`,
      checkinStatus: 'pending'
    }));
    
    coaches.push({ coachId, sport, district });
  }
  
  await Promise.all(coachPromises);
  
  // 4. Create 50 players
  console.log('🏃‍♀️ Creating 50 players...');
  const playerPromises = [];
  
  for (let i = 0; i < 50; i++) {
    const coach = coaches[i % coaches.length];
    
    playerPromises.push(db.insert(participants).values({
      participantId: `CM2025-${String(i + 1000).padStart(6, '0')}`,
      name: `Player ${i + 1}`,
      mobileNumber: getNextMobile(),
      role: 'player',
      discipline: coach.sport,
      district: coach.district,
      teamName: `${coach.district} ${coach.sport} Team`,
      coachId: coach.coachId,
      hotelId: `HOTEL-${String((i % 10) + 1).padStart(3, '0')}`,
      hotelName: `${hotelChains[i % hotelChains.length]} ${coach.district}`,
      bookingStartDate: new Date(2025, 8, 1),
      bookingEndDate: new Date(2025, 8, 15),
      bookingReference: `BK-PLAYER-${i + 1}`,
      checkinStatus: Math.random() > 0.5 ? 'checked_in' : 'pending'
    }));
  }
  
  await Promise.all(playerPromises);
  
  // 5. Create 5 officials
  console.log('⚖️ Creating 5 officials...');
  const officialPromises = [];
  
  for (let i = 0; i < 5; i++) {
    officialPromises.push(db.insert(participants).values({
      participantId: `OFF-${String(i + 1).padStart(3, '0')}`,
      name: `Official ${i + 1}`,
      mobileNumber: getNextMobile(),
      role: 'official',
      discipline: sports[i % sports.length],
      district: districts[i % districts.length],
      teamName: `Official - ${sports[i % sports.length]}`,
      hotelId: `HOTEL-${String((i % 10) + 1).padStart(3, '0')}`,
      hotelName: `${hotelChains[i % hotelChains.length]} ${districts[i % districts.length]}`,
      bookingStartDate: new Date(2025, 8, 1),
      bookingEndDate: new Date(2025, 8, 15),
      bookingReference: `BK-OFF-${i + 1}`,
      checkinStatus: 'pending'
    }));
  }
  
  await Promise.all(officialPromises);
  
  console.log('\n✅ Quick test data generated successfully!');
  console.log('📊 Summary:');
  console.log('   👥 Coaches: 5');
  console.log('   🏃‍♀️ Players: 50');
  console.log('   ⚖️ Officials: 5');
  console.log('   🏨 Hotels: 5 unique hotels with 13 instances');
  console.log('   📅 Date ranges: Sep 1-15, Sep 20-30, Oct 5-20');
  console.log('   📱 Total participants: 60');
  console.log('\n🔑 Admin Login: admin@ievolve.com / IevolveAdmin2025!');
  console.log('📱 Admin Mobile: +919344100312');
  console.log('\n🎯 This is test data - use the full generation script for production volumes');
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  quickGenerateData()
    .then(() => {
      console.log('🎉 Quick data generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate test data:', error);
      process.exit(1);
    });
}

export { quickGenerateData };