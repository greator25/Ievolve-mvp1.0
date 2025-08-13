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

  // Create default admin user
  static async createDefaultAdmin() {
    const existingAdmin = await storage.getUserByEmail("admin@ievolve.com");
    if (!existingAdmin) {
      const hashedPassword = await this.hashPassword("admin123");
      await storage.createUser({
        email: "admin@ievolve.com",
        password: hashedPassword,
        name: "System Admin",
        role: "admin",
        isActive: true,
      });
      console.log("Default admin created: admin@ievolve.com / admin123");
    }
  }
}
