import { db } from '../server/db.js';
import { users, hotels, participants } from '../shared/schema.js';
import bcrypt from 'bcryptjs';

// Generate realistic test data for 2025 Chief Minister Trophy event
const generateTestData = async () => {
  console.log('🚀 Starting fresh test data generation...');
  
  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await db.delete(users);
  await db.delete(hotels);
  await db.delete(participants);
  
  // Tamil Nadu districts for realistic data
  const districts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Vellore', 'Erode', 'Tiruppur', 'Dindigul', 'Thanjavur', 'Cuddalore',
    'Kanchipuram', 'Virudhunagar', 'Karur', 'Thoothukudi', 'Nagapattinam',
    'Villupuram', 'Sivaganga', 'Ramanathapuram', 'Dharmapuri', 'Krishnagiri'
  ];
  
  // Sports disciplines for 2025 event
  const sports = [
    'Athletics', 'Swimming', 'Basketball', 'Football', 'Volleyball', 'Cricket',
    'Badminton', 'Tennis', 'Table Tennis', 'Kabaddi', 'Kho Kho', 'Hockey',
    'Wrestling', 'Boxing', 'Weightlifting', 'Cycling', 'Archery', 'Shooting'
  ];
  
  // Hotel chains and locations
  const hotelData = [
    { chain: 'ITC', locations: ['Chennai', 'Coimbatore', 'Madurai'] },
    { chain: 'Taj', locations: ['Chennai', 'Madurai', 'Tiruchirappalli'] },
    { chain: 'Marriott', locations: ['Chennai', 'Coimbatore'] },
    { chain: 'Hyatt', locations: ['Chennai'] },
    { chain: 'Radisson', locations: ['Chennai', 'Coimbatore', 'Salem'] },
    { chain: 'Hilton', locations: ['Chennai', 'Coimbatore'] },
    { chain: 'Park', locations: ['Chennai', 'Madurai', 'Salem'] },
    { chain: 'Vivanta', locations: ['Chennai', 'Coimbatore', 'Vellore'] },
    { chain: 'GRT', locations: ['Chennai', 'Tiruchirappalli', 'Madurai'] },
    { chain: 'Trident', locations: ['Chennai'] }
  ];
  
  // Generate unique mobile numbers starting from base
  let mobileCounter = 9344100000;
  const getNextMobile = () => `+91${++mobileCounter}`;
  
  // Generate participant ID counter
  let participantIdCounter = 1000;
  const getNextParticipantId = () => `CM2025-${String(++participantIdCounter).padStart(6, '0')}`;
  
  // Generate coach ID counter  
  let coachIdCounter = 5000;
  const getNextCoachId = () => `COACH-${String(++coachIdCounter).padStart(5, '0')}`;
  
  // 1. Generate Hotels (164 total)
  console.log('🏨 Generating hotels...');
  const hotelPromises = [];
  
  for (let i = 0; i < 164; i++) {
    const chain = hotelData[i % hotelData.length];
    const location = chain.locations[Math.floor(Math.random() * chain.locations.length)];
    const district = location;
    
    // Generate multiple instances per hotel for different date ranges
    const instances = Math.floor(Math.random() * 3) + 1; // 1-3 instances per hotel
    
    for (let instance = 0; instance < instances; instance++) {
      const startDate = new Date(2025, 7 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1); // Aug-Nov 2025
      const endDate = new Date(startDate.getTime() + (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000); // 7-21 days later
      
      const totalRooms = 50 + Math.floor(Math.random() * 200); // 50-250 rooms
      const occupiedRooms = Math.floor(Math.random() * Math.floor(totalRooms * 0.8)); // Up to 80% occupied
      
      hotelPromises.push(db.insert(hotels).values({
        hotelId: `HOTEL-${String(i + 1).padStart(3, '0')}`,
        instanceCode: `${String.fromCharCode(65 + instance)}`, // A, B, C
        hotelName: `${chain.chain} ${location}`,
        location: location,
        district: district,
        address: `${Math.floor(Math.random() * 999) + 1}, ${['Anna Salai', 'Mount Road', 'GST Road', 'OMR', 'ECR'][Math.floor(Math.random() * 5)]}, ${location}`,
        pincode: `${600 + Math.floor(Math.random() * 100)}${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        startDate: startDate,
        endDate: endDate,
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        availableRooms: totalRooms - occupiedRooms
      }));
    }
  }
  
  await Promise.all(hotelPromises);
  console.log(`✅ Generated hotels with multiple instances`);
  
  // 2. Generate Admin User
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('IevolveAdmin2025!', 10);
  await db.insert(users).values({
    email: 'admin@ievolve.com',
    password: adminPassword,
    mobileNumber: '+919344100312',
    role: 'admin',
    isActive: true
  });
  
  // 3. Generate Coaches (986 total)
  console.log('🏃‍♂️ Generating coaches...');
  const coachNames = [
    'Rajesh', 'Priya', 'Karthik', 'Meera', 'Suresh', 'Lakshmi', 'Arun', 'Divya',
    'Mohan', 'Sneha', 'Vijay', 'Kavitha', 'Raman', 'Deepa', 'Kumar', 'Sita',
    'Ganesh', 'Radha', 'Ashok', 'Maya', 'Venkat', 'Geetha', 'Bala', 'Shanti'
  ];
  
  const surnames = [
    'Kumar', 'Sharma', 'Iyer', 'Nair', 'Reddy', 'Pillai', 'Menon', 'Raman',
    'Krishnan', 'Subramanian', 'Natarajan', 'Murugan', 'Selvam', 'Raja',
    'Sundaram', 'Moorthy', 'Swamy', 'Babu', 'Prasad', 'Chandra'
  ];
  
  const coachPromises = [];
  const coachData = [];
  
  for (let i = 0; i < 986; i++) {
    const firstName = coachNames[Math.floor(Math.random() * coachNames.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const fullName = `${firstName} ${lastName}`;
    const mobileNumber = getNextMobile();
    const coachId = getNextCoachId();
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    // Create user account for coach
    coachPromises.push(db.insert(users).values({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@coach.ievolve.com`,
      mobileNumber: mobileNumber,
      role: 'coach',
      coachId: coachId,
      isActive: true
    }));
    
    // Create participant record for coach
    coachPromises.push(db.insert(participants).values({
      participantId: coachId,
      name: fullName,
      age: 28 + Math.floor(Math.random() * 15), // 28-42 years old
      gender: Math.random() > 0.3 ? 'Male' : 'Female', // 70% male coaches
      mobileNumber: mobileNumber,
      role: 'Coach',
      discipline: sport,
      team: `${district} ${sport} Team`,
      district: district,
      checkinStatus: Math.random() > 0.7 ? 'checked-in' : 'pending',
      accommodationStatus: Math.random() > 0.8 ? 'assigned' : 'pending',
      medicalStatus: Math.random() > 0.9 ? 'cleared' : 'pending'
    }));
    
    coachData.push({ coachId, sport, district, name: fullName });
  }
  
  await Promise.all(coachPromises);
  console.log(`✅ Generated 986 coaches`);
  
  // 4. Generate Officials (232 total)
  console.log('⚖️ Generating officials...');
  const officialRoles = [
    'Chief Referee', 'Referee', 'Umpire', 'Judge', 'Technical Official',
    'Medical Officer', 'Scorer', 'Timekeeper', 'Field Marshal', 'Coordinator'
  ];
  
  const officialPromises = [];
  
  for (let i = 0; i < 232; i++) {
    const firstName = coachNames[Math.floor(Math.random() * coachNames.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const fullName = `${firstName} ${lastName}`;
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const officialRole = officialRoles[Math.floor(Math.random() * officialRoles.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    officialPromises.push(db.insert(participants).values({
      participantId: getNextParticipantId(),
      name: fullName,
      age: 35 + Math.floor(Math.random() * 20), // 35-54 years old
      gender: Math.random() > 0.4 ? 'Male' : 'Female',
      mobileNumber: getNextMobile(),
      role: 'Official',
      discipline: sport,
      team: `${officialRole} - ${sport}`,
      district: district,
      checkinStatus: Math.random() > 0.6 ? 'checked-in' : 'pending',
      accommodationStatus: Math.random() > 0.7 ? 'assigned' : 'pending',
      medicalStatus: Math.random() > 0.8 ? 'cleared' : 'pending'
    }));
  }
  
  await Promise.all(officialPromises);
  console.log(`✅ Generated 232 officials`);
  
  // 5. Generate Students/Players (9234 total)
  console.log('🏃‍♀️ Generating students/players...');
  const studentFirstNames = [
    'Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Kiran', 'Mira',
    'Neel', 'Priya', 'Rohan', 'Shreya', 'Tanvi', 'Varun', 'Zara', 'Dev',
    'Riya', 'Aadhya', 'Vivaan', 'Aisha', 'Reyansh', 'Sara', 'Kiaan', 'Myra'
  ];
  
  const playerPromises = [];
  let studentsPerCoach = Math.floor(9234 / 986); // ~9-10 students per coach
  let remainingStudents = 9234;
  
  for (let coachIndex = 0; coachIndex < coachData.length && remainingStudents > 0; coachIndex++) {
    const coach = coachData[coachIndex];
    const studentsForThisCoach = Math.min(
      studentsPerCoach + Math.floor(Math.random() * 3), // 9-12 students per coach
      remainingStudents
    );
    
    for (let j = 0; j < studentsForThisCoach; j++) {
      const firstName = studentFirstNames[Math.floor(Math.random() * studentFirstNames.length)];
      const lastName = surnames[Math.floor(Math.random() * surnames.length)];
      const fullName = `${firstName} ${lastName}`;
      const age = 16 + Math.floor(Math.random() * 10); // 16-25 years old
      
      playerPromises.push(db.insert(participants).values({
        participantId: getNextParticipantId(),
        name: fullName,
        age: age,
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        mobileNumber: getNextMobile(),
        role: 'Player',
        discipline: coach.sport,
        team: `${coach.district} ${coach.sport} Team`,
        district: coach.district,
        coachId: coach.coachId,
        checkinStatus: Math.random() > 0.5 ? 'checked-in' : 'pending',
        accommodationStatus: Math.random() > 0.6 ? 'assigned' : 'pending',
        medicalStatus: Math.random() > 0.7 ? 'cleared' : 'pending'
      }));
      
      remainingStudents--;
    }
  }
  
  // Process in batches to avoid overwhelming the database
  console.log('📦 Processing student data in batches...');
  const batchSize = 500;
  for (let i = 0; i < playerPromises.length; i += batchSize) {
    const batch = playerPromises.slice(i, i + batchSize);
    await Promise.all(batch);
    console.log(`   Processed ${Math.min(i + batchSize, playerPromises.length)}/${playerPromises.length} students`);
  }
  
  console.log(`✅ Generated ${9234 - remainingStudents} students/players`);
  
  // Summary
  console.log('\n🎉 Fresh test data generation completed!');
  console.log('📊 Summary:');
  console.log(`   👥 Coaches: 986`);
  console.log(`   🏃‍♀️ Students/Players: ${9234 - remainingStudents}`);
  console.log(`   ⚖️ Officials: 232`);
  console.log(`   🏨 Hotels: 164 (with multiple date instances)`);
  console.log(`   📱 Total participants: ${986 + (9234 - remainingStudents) + 232}`);
  console.log(`   🏆 Event: Chief Minister Trophy 2025 - Tamil Nadu`);
  console.log('\n🔑 Admin Login: admin@ievolve.com / IevolveAdmin2025!');
  console.log('📱 Admin Mobile: +919344100312');
  
  process.exit(0);
};

// Run the generation
generateTestData().catch(console.error);