import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "coach"]);
export const participantRoleEnum = pgEnum("participant_role", ["coach", "official", "player"]);
export const checkinStatusEnum = pgEnum("checkin_status", ["pending", "checked_in", "checked_out"]);
export const bookingTypeEnum = pgEnum("booking_type", ["regular", "pre_event", "post_event"]);
export const hotelStatusEnum = pgEnum("hotel_status", ["upcoming", "active", "expired"]);

// Users table (Admins and Coaches)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(), // For admins
  password: text("password"), // For admins (hashed)
  mobileNumber: text("mobile_number").unique(), // For coaches
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull(),
  coachId: text("coach_id").unique(), // For coaches (COA_001, etc.)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hotels table
export const hotels = pgTable("hotels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelId: text("hotel_id").notNull(), // CHN001, MDU005, etc.
  instanceCode: text("instance_code").notNull(), // 1, 2, 3, etc.
  hotelName: text("hotel_name").notNull(),
  location: text("location").notNull(),
  district: text("district").notNull(),
  address: text("address").notNull(),
  pincode: text("pincode").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalRooms: integer("total_rooms").notNull(),
  occupiedRooms: integer("occupied_rooms").default(0),
  availableRooms: integer("available_rooms").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Participants table (Coaches, Officials, Players)
export const participants = pgTable("participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participantId: text("participant_id").notNull().unique(), // COA_001, OFC_001, PLA_001
  name: text("name").notNull(),
  mobileNumber: text("mobile_number"),
  role: participantRoleEnum("role").notNull(),
  discipline: text("discipline").notNull(),
  district: text("district"),
  teamName: text("team_name"),
  coachId: text("coach_id"), // For players, references coach
  hotelId: text("hotel_id").notNull(),
  hotelName: text("hotel_name").notNull(),
  stadium: text("stadium"),
  bookingStartDate: timestamp("booking_start_date").notNull(),
  bookingEndDate: timestamp("booking_end_date").notNull(),
  bookingReference: text("booking_reference").notNull(),
  bookingType: bookingTypeEnum("booking_type").default("regular"),
  transportPoc: text("transport_poc"), // For coaches and officials
  checkinStatus: checkinStatusEnum("checkin_status").default("pending"),
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  actualCheckoutDate: timestamp("actual_checkout_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reassignments table
export const reassignments = pgTable("reassignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalParticipantId: text("original_participant_id").notNull(),
  newParticipantId: text("new_participant_id").notNull(),
  newBookingReference: text("new_booking_reference").notNull(),
  reason: text("reason"),
  reassignedBy: text("reassigned_by").notNull(),
  reassignedAt: timestamp("reassigned_at").defaultNow(),
});

// OTP table for SMS verification
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"), // For admin OTP
  otp: text("otp").notNull(),
  purpose: text("purpose").notNull(), // "admin_login", "coach_login"
  isUsed: boolean("is_used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  actionType: text("action_type").notNull(), // upload, edit, delete, checkin, checkout, reassign
  targetEntity: text("target_entity").notNull(), // participant, hotel, etc.
  targetId: text("target_id"),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLog),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  coach: one(users, {
    fields: [participants.coachId],
    references: [users.coachId],
  }),
  reassignments: many(reassignments),
}));

export const reassignmentsRelations = relations(reassignments, ({ one }) => ({
  originalParticipant: one(participants, {
    fields: [reassignments.originalParticipantId],
    references: [participants.participantId],
  }),
  reassignedBy: one(users, {
    fields: [reassignments.reassignedBy],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHotelSchema = createInsertSchema(hotels).omit({
  id: true,
  createdAt: true,
});

// Hotel update schema (excludes hotelId, instanceCode, and id)
export const updateHotelSchema = createInsertSchema(hotels).omit({
  id: true,
  hotelId: true,
  instanceCode: true,
  createdAt: true,
}).extend({
  // Override date fields to accept strings and transform to Date objects
  startDate: z.string().min(1, "Start date is required").transform((str) => new Date(str)),
  endDate: z.string().min(1, "End date is required").transform((str) => new Date(str)),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const insertParticipantSchema = createInsertSchema(participants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReassignmentSchema = createInsertSchema(reassignments).omit({
  id: true,
  reassignedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  timestamp: true,
});

export const insertOtpSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type UpdateHotel = z.infer<typeof updateHotelSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Reassignment = typeof reassignments.$inferSelect;
export type InsertReassignment = z.infer<typeof insertReassignmentSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpSchema>;

// Additional schemas for API validation
export const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  mobileNumber: z.string().optional(),
  otp: z.string().optional(),
  role: z.enum(["admin", "coach"]).optional(),
});

export const otpRequestSchema = z.object({
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional(),
  purpose: z.enum(["admin_login", "coach_login"]),
});

export const otpVerifySchema = z.object({
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional(),
  otp: z.string().length(6),
  purpose: z.enum(["admin_login", "coach_login"]),
});

export const uploadFileSchema = z.object({
  type: z.enum(["hotel_inventory", "coaches_officials", "players"]),
  validateHotelIds: z.boolean().default(true),
  enforceMinimumStay: z.boolean().default(true),
  skipDuplicates: z.boolean().default(false),
});

export const checkinSchema = z.object({
  participantIds: z.array(z.string()),
  checkinTime: z.string().datetime().optional(),
});

export const checkoutSchema = z.object({
  participantIds: z.array(z.string()),
  checkoutTime: z.string().datetime().optional(),
  newCheckoutDate: z.string().datetime().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type UploadFileRequest = z.infer<typeof uploadFileSchema>;
export type CheckinRequest = z.infer<typeof checkinSchema>;

// Hotel status calculation utility
export function calculateHotelStatus(startDate: Date, endDate: Date): "upcoming" | "active" | "expired" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Reset time to 00:00:00
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  if (today < start) {
    return "upcoming";
  } else if (today > end) {
    return "expired";
  } else {
    return "active";
  }
}

// Extended hotel type with computed status
export type HotelWithStatus = Hotel & {
  status: "upcoming" | "active" | "expired";
};
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
