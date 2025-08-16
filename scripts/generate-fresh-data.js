import { db } from '../server/db.js';
import { users, hotels, participants } from '../shared/schema.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { cleanupOldData } from './cleanup-data.js';

const generateFreshData = async () => {
  console.log('🚀 Starting fresh test data generation for Chief Minister Trophy 2025');
  
  // Clean up old data first
  await cleanupOldData();
  
  // Tamil Nadu districts and realistic data
  const districts = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Vellore', 'Erode', 'Tiruppur', 'Dindigul', 'Thanjavur', 'Cuddalore',
    'Kanchipuram', 'Virudhunagar', 'Karur', 'Thoothukudi', 'Nagapattinam',
    'Villupuram', 'Sivaganga', 'Ramanathapuram', 'Dharmapuri', 'Krishnagiri',
    'Namakkal', 'Perambalur', 'Pudukkottai', 'Theni', 'Nilgiris', 'Ariyalur'
  ];
  
  const sports = [
    'Athletics', 'Swimming', 'Basketball', 'Football', 'Volleyball', 'Cricket',
    'Badminton', 'Tennis', 'Table Tennis', 'Kabaddi', 'Kho Kho', 'Hockey',
    'Wrestling', 'Boxing', 'Weightlifting', 'Cycling', 'Archery', 'Shooting',
    'Gymnastics', 'Judo', 'Taekwondo', 'Chess', 'Carrom', 'Handball'
  ];
  
  const hotelChains = [
    'ITC', 'Taj', 'Marriott', 'Hyatt', 'Radisson', 'Hilton', 'Park',
    'Vivanta', 'GRT', 'Trident', 'Fortune', 'Accord', 'Residency',
    'Gateway', 'Ambassador', 'Savera', 'Raintree', 'Feathers'
  ];
  
  // Counters for unique IDs
  let mobileCounter = 9344100000;
  let participantIdCounter = 1000;
  let coachIdCounter = 5000;
  
  const getNextMobile = () => `+91${++mobileCounter}`;
  const getNextParticipantId = () => `CM2025-${String(++participantIdCounter).padStart(6, '0')}`;
  const getNextCoachId = () => `COACH-${String(++coachIdCounter).padStart(5, '0')}`;
  
  // Arrays to store data for PSV export
  const hotelData = [];
  const participantData = [];
  const coachData = [];
  
  // 1. Create Admin User
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('IevolveAdmin2025!', 10);
  await db.insert(users).values({
    name: 'System Administrator',
    email: 'admin@ievolve.com',
    password: adminPassword,
    mobileNumber: '+919344100312',
    role: 'admin',
    isActive: true
  });
  
  // 2. Generate Hotels (164 total)
  console.log('🏨 Generating 164 hotels...');
  const hotelPromises = [];
  
  for (let i = 0; i < 164; i++) {
    const chain = hotelChains[i % hotelChains.length];
    const district = districts[i % districts.length];
    const hotelId = `HOTEL-${String(i + 1).padStart(3, '0')}`;
    
    // Generate 1-3 instances per hotel for different date ranges
    const instances = Math.floor(Math.random() * 3) + 1;
    
    for (let instance = 0; instance < instances; instance++) {
      const startDate = new Date(2025, 7 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1);
      const endDate = new Date(startDate.getTime() + (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000);
      
      const totalRooms = 50 + Math.floor(Math.random() * 200);
      const occupiedRooms = Math.floor(Math.random() * Math.floor(totalRooms * 0.8));
      
      const hotelRecord = {
        hotelId: hotelId,
        instanceCode: String.fromCharCode(65 + instance),
        hotelName: `${chain} ${district}`,
        location: district,
        district: district,
        address: `${Math.floor(Math.random() * 999) + 1}, ${['Anna Salai', 'Mount Road', 'GST Road', 'OMR', 'ECR'][Math.floor(Math.random() * 5)]}, ${district}`,
        pincode: `${600 + Math.floor(Math.random() * 100)}${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        startDate: startDate,
        endDate: endDate,
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        availableRooms: totalRooms - occupiedRooms
      };
      
      hotelPromises.push(db.insert(hotels).values(hotelRecord));
      hotelData.push(hotelRecord);
    }
  }
  
  await Promise.all(hotelPromises);
  console.log(`✅ Generated ${hotelData.length} hotel instances from 164 hotels`);
  
  // 3. Generate Coaches (986 total)
  console.log('🏃‍♂️ Generating 986 coaches...');
  const names = {
    male: ['Rajesh', 'Karthik', 'Suresh', 'Arun', 'Mohan', 'Vijay', 'Raman', 'Kumar', 'Ganesh', 'Ashok', 'Venkat', 'Bala'],
    female: ['Priya', 'Meera', 'Lakshmi', 'Divya', 'Sneha', 'Kavitha', 'Deepa', 'Sita', 'Radha', 'Maya', 'Geetha', 'Shanti']
  };
  
  const surnames = ['Kumar', 'Sharma', 'Iyer', 'Nair', 'Reddy', 'Pillai', 'Menon', 'Raman', 'Krishnan', 'Subramanian'];
  
  const coachPromises = [];
  const coaches = [];
  
  for (let i = 0; i < 986; i++) {
    const gender = Math.random() > 0.3 ? 'Male' : 'Female';
    const firstName = gender === 'Male' ? 
      names.male[Math.floor(Math.random() * names.male.length)] :
      names.female[Math.floor(Math.random() * names.female.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const fullName = `${firstName} ${lastName}`;
    const mobileNumber = getNextMobile();
    const coachId = getNextCoachId();
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const age = 28 + Math.floor(Math.random() * 15);
    
    // Create user account
    coachPromises.push(db.insert(users).values({
      name: fullName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@coach.ievolve.com`,
      mobileNumber: mobileNumber,
      role: 'coach',
      coachId: coachId,
      isActive: true
    }));
    
    // Create participant record
    const coachParticipant = {
      participantId: coachId,
      name: fullName,
      mobileNumber: mobileNumber,
      role: 'coach',
      discipline: sport,
      district: district,
      teamName: `${district} ${sport} Team`,
      hotelId: `HOTEL-${String(Math.floor(Math.random() * 164) + 1).padStart(3, '0')}`,
      hotelName: `${hotelChains[Math.floor(Math.random() * hotelChains.length)]} ${district}`,
      bookingStartDate: new Date(2025, 7, Math.floor(Math.random() * 30) + 1),
      bookingEndDate: new Date(2025, 8, Math.floor(Math.random() * 30) + 1),
      bookingReference: `BK-${coachId}`,
      checkinStatus: Math.random() > 0.7 ? 'checked_in' : 'pending'
    };
    
    coachPromises.push(db.insert(participants).values(coachParticipant));
    participantData.push(coachParticipant);
    coaches.push({ coachId, sport, district, name: fullName });
  }
  
  await Promise.all(coachPromises);
  console.log('✅ Generated 986 coaches with user accounts');
  
  // 4. Generate Officials (232 total)
  console.log('⚖️ Generating 232 officials...');
  const officialRoles = [
    'Chief Referee', 'Referee', 'Umpire', 'Judge', 'Technical Official',
    'Medical Officer', 'Scorer', 'Timekeeper', 'Field Marshal', 'Coordinator'
  ];
  
  const officialPromises = [];
  
  for (let i = 0; i < 232; i++) {
    const gender = Math.random() > 0.4 ? 'Male' : 'Female';
    const firstName = gender === 'Male' ? 
      names.male[Math.floor(Math.random() * names.male.length)] :
      names.female[Math.floor(Math.random() * names.female.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const fullName = `${firstName} ${lastName}`;
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const officialRole = officialRoles[Math.floor(Math.random() * officialRoles.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    const official = {
      participantId: getNextParticipantId(),
      name: fullName,
      mobileNumber: getNextMobile(),
      role: 'official',
      discipline: sport,
      district: district,
      teamName: `${officialRole} - ${sport}`,
      hotelId: `HOTEL-${String(Math.floor(Math.random() * 164) + 1).padStart(3, '0')}`,
      hotelName: `${hotelChains[Math.floor(Math.random() * hotelChains.length)]} ${district}`,
      bookingStartDate: new Date(2025, 7, Math.floor(Math.random() * 30) + 1),
      bookingEndDate: new Date(2025, 8, Math.floor(Math.random() * 30) + 1),
      bookingReference: `BK-${getNextParticipantId()}`,
      checkinStatus: Math.random() > 0.6 ? 'checked_in' : 'pending'
    };
    
    officialPromises.push(db.insert(participants).values(official));
    participantData.push(official);
  }
  
  await Promise.all(officialPromises);
  console.log('✅ Generated 232 officials');
  
  // 5. Generate Students/Players (9234 total)
  console.log('🏃‍♀️ Generating 9234 students/players...');
  const studentNames = {
    male: ['Aarav', 'Arjun', 'Ishaan', 'Kiran', 'Neel', 'Rohan', 'Varun', 'Dev', 'Vivaan', 'Reyansh', 'Kiaan'],
    female: ['Ananya', 'Diya', 'Kavya', 'Mira', 'Priya', 'Shreya', 'Tanvi', 'Zara', 'Riya', 'Aadhya', 'Aisha', 'Sara', 'Myra']
  };
  
  const playerPromises = [];
  const studentsPerCoach = Math.floor(9234 / 986);
  let remainingStudents = 9234;
  
  // Distribute students among coaches
  for (let coachIndex = 0; coachIndex < coaches.length && remainingStudents > 0; coachIndex++) {
    const coach = coaches[coachIndex];
    const studentsForThisCoach = Math.min(
      studentsPerCoach + Math.floor(Math.random() * 3),
      remainingStudents
    );
    
    for (let j = 0; j < studentsForThisCoach; j++) {
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';
      const firstName = gender === 'Male' ? 
        studentNames.male[Math.floor(Math.random() * studentNames.male.length)] :
        studentNames.female[Math.floor(Math.random() * studentNames.female.length)];
      const lastName = surnames[Math.floor(Math.random() * surnames.length)];
      const fullName = `${firstName} ${lastName}`;
      
      const player = {
        participantId: getNextParticipantId(),
        name: fullName,
        mobileNumber: getNextMobile(),
        role: 'player',
        discipline: coach.sport,
        district: coach.district,
        teamName: `${coach.district} ${coach.sport} Team`,
        coachId: coach.coachId,
        hotelId: `HOTEL-${String(Math.floor(Math.random() * 164) + 1).padStart(3, '0')}`,
        hotelName: `${hotelChains[Math.floor(Math.random() * hotelChains.length)]} ${coach.district}`,
        bookingStartDate: new Date(2025, 7, Math.floor(Math.random() * 30) + 1),
        bookingEndDate: new Date(2025, 8, Math.floor(Math.random() * 30) + 1),
        bookingReference: `BK-${getNextParticipantId()}`,
        checkinStatus: Math.random() > 0.5 ? 'checked_in' : 'pending'
      };
      
      playerPromises.push(db.insert(participants).values(player));
      participantData.push(player);
      remainingStudents--;
    }
  }
  
  // Process in batches
  const batchSize = 500;
  for (let i = 0; i < playerPromises.length; i += batchSize) {
    const batch = playerPromises.slice(i, i + batchSize);
    await Promise.all(batch);
    console.log(`   Processed ${Math.min(i + batchSize, playerPromises.length)}/${playerPromises.length} students`);
  }
  
  console.log(`✅ Generated ${9234 - remainingStudents} students/players`);
  
  // 6. Generate PSV files
  console.log('📄 Generating PSV files...');
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Generate Hotels PSV
  const hotelsPsv = [
    'hotelId|instanceCode|hotelName|location|district|address|pincode|startDate|endDate|totalRooms|occupiedRooms|availableRooms'
  ];
  
  hotelData.forEach(hotel => {
    hotelsPsv.push([
      hotel.hotelId,
      hotel.instanceCode,
      hotel.hotelName,
      hotel.location,
      hotel.district,
      hotel.address,
      hotel.pincode,
      hotel.startDate.toISOString().split('T')[0],
      hotel.endDate.toISOString().split('T')[0],
      hotel.totalRooms,
      hotel.occupiedRooms,
      hotel.availableRooms
    ].join('|'));
  });
  
  fs.writeFileSync(path.join(dataDir, 'hotels_2025.psv'), hotelsPsv.join('\n'));
  
  // Generate Participants PSV
  const participantsPsv = [
    'participantId|name|mobileNumber|role|discipline|district|teamName|coachId|hotelId|hotelName|bookingStartDate|bookingEndDate|bookingReference|checkinStatus'
  ];
  
  participantData.forEach(participant => {
    participantsPsv.push([
      participant.participantId,
      participant.name,
      participant.mobileNumber,
      participant.role,
      participant.discipline,
      participant.district,
      participant.teamName || '',
      participant.coachId || '',
      participant.hotelId,
      participant.hotelName,
      participant.bookingStartDate.toISOString().split('T')[0],
      participant.bookingEndDate.toISOString().split('T')[0],
      participant.bookingReference,
      participant.checkinStatus
    ].join('|'));
  });
  
  fs.writeFileSync(path.join(dataDir, 'participants_2025.psv'), participantsPsv.join('\n'));
  
  console.log('✅ Generated PSV files in /data directory');
  
  // Final Summary
  console.log('\n🎉 Fresh test data generation completed!');
  console.log('📊 Summary:');
  console.log(`   👥 Coaches: 986`);
  console.log(`   🏃‍♀️ Students/Players: ${9234 - remainingStudents}`);
  console.log(`   ⚖️ Officials: 232`);
  console.log(`   🏨 Hotels: 164 (with ${hotelData.length} instances)`);
  console.log(`   📱 Total participants: ${participantData.length}`);
  console.log(`   🏆 Event: Chief Minister Trophy 2025 - Tamil Nadu`);
  console.log('\n📄 Generated PSV Files:');
  console.log(`   📁 data/hotels_2025.psv`);
  console.log(`   📁 data/participants_2025.psv`);
  console.log('\n🔑 Admin Login: admin@ievolve.com / IevolveAdmin2025!');
  console.log('📱 Admin Mobile: +919344100312');
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateFreshData()
    .then(() => {
      console.log('🎉 Data generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate data:', error);
      process.exit(1);
    });
}

export { generateFreshData };