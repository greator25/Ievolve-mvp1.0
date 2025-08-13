import { storage } from "../storage";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// In-memory OTP storage (in production, use Redis or similar)
const otpStore = new Map<string, { otp: string; expires: number }>();

export class AuthService {
  // Admin login with email/password
  static async loginAdmin(email: string, password: string) {
    const user = await storage.getUserByEmail(email);
    if (!user || user.role !== "admin" || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    return user;
  }

  // Send OTP to coach mobile number
  static async sendOTP(mobileNumber: string) {
    const user = await storage.getUserByMobile(mobileNumber);
    if (!user || user.role !== "coach") {
      throw new Error("Coach not found with this mobile number");
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(mobileNumber, { otp, expires });

    // TODO: Send SMS using external service
    console.log(`OTP for ${mobileNumber}: ${otp}`);

    return { message: "OTP sent successfully" };
  }

  // Verify OTP for coach login
  static async verifyOTP(mobileNumber: string, otp: string) {
    const storedOTP = otpStore.get(mobileNumber);
    if (!storedOTP) {
      throw new Error("OTP not found or expired");
    }

    if (Date.now() > storedOTP.expires) {
      otpStore.delete(mobileNumber);
      throw new Error("OTP expired");
    }

    if (storedOTP.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    otpStore.delete(mobileNumber);

    const user = await storage.getUserByMobile(mobileNumber);
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // Hash password for admin users
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // Create default admin user and sample data
  static async createDefaultAdmin() {
    const existingAdmin = await storage.getUserByEmail("admin@ievolve.com");
    if (!existingAdmin) {
      // Create secure admin password
      const securePassword = "IevolveAdmin2025!";
      const hashedPassword = await this.hashPassword(securePassword);
      await storage.createUser({
        email: "admin@ievolve.com",
        password: hashedPassword,
        name: "System Admin",
        role: "admin",
        isActive: true,
      });
      console.log(`Default admin created: admin@ievolve.com / ${securePassword}`);
      
      // Create sample coach users
      await this.createSampleData();
    }
  }

  // Create sample users and data for testing
  static async createSampleData() {
    try {
      // Create sample coach users
      const sampleCoaches = [
        {
          email: "coach.basketball@ievolve.com",
          mobileNumber: "+918888888881",
          name: "Rajesh Kumar",
          role: "coach" as const,
          coachId: "COACH_001",
          isActive: true,
        },
        {
          email: "coach.football@ievolve.com", 
          mobileNumber: "+918888888882",
          name: "Priya Sharma",
          role: "coach" as const,
          coachId: "COACH_002", 
          isActive: true,
        }
      ];

      for (const coach of sampleCoaches) {
        const existing = await storage.getUserByMobile(coach.mobileNumber);
        if (!existing) {
          await storage.createUser(coach);
        }
      }

      // Create sample hotels
      const sampleHotels = [
        {
          hotelId: "HOTEL_001",
          instanceCode: "INST_001",
          hotelName: "Grand Plaza Hotel",
          location: "Central Mumbai",
          district: "Mumbai",
          totalRooms: 50,
          occupiedRooms: 35,
          availableRooms: 15,
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-15'),
        },
        {
          hotelId: "HOTEL_002", 
          instanceCode: "INST_001",
          hotelName: "Coastal Resort",
          location: "Marine Drive", 
          district: "Mumbai",
          totalRooms: 30,
          occupiedRooms: 20,
          availableRooms: 10,
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-15'),
        }
      ];

      for (const hotel of sampleHotels) {
        const existing = await storage.getHotelByHotelIdAndInstance(hotel.hotelId, hotel.instanceCode);
        if (!existing) {
          await storage.createHotel(hotel);
        }
      }

      console.log("Sample data created successfully");
    } catch (error) {
      console.log("Sample data creation failed:", error);
    }
  }
}
