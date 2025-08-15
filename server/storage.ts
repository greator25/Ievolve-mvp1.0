import { 
  users, hotels, participants, reassignments, auditLog,
  type User, type InsertUser, type Hotel, type InsertHotel, type UpdateHotel,
  type Participant, type InsertParticipant, type Reassignment, 
  type InsertReassignment, type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, or, like, desc, asc, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMobile(mobileNumber: string): Promise<User | undefined>;
  getUserByCoachId(coachId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Hotel management
  getHotels(): Promise<Hotel[]>;
  getHotelById(id: string): Promise<Hotel | undefined>;
  getHotelByHotelIdAndInstance(hotelId: string, instanceCode: string): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: string, updates: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: string): Promise<boolean>;
  getHotelsWithOverlappingDates(hotelId: string, startDate: Date, endDate: Date): Promise<Hotel[]>;
  checkHotelDateConflicts(hotelId: string, excludeInstanceCode: string, startDate: Date, endDate: Date): Promise<Hotel[]>;

  // Participant management
  getParticipants(filters?: ParticipantFilters): Promise<Participant[]>;
  getParticipantById(id: string): Promise<Participant | undefined>;
  getParticipantByParticipantId(participantId: string): Promise<Participant | undefined>;
  getParticipantsByCoachId(coachId: string): Promise<Participant[]>;
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  updateParticipant(id: string, updates: Partial<InsertParticipant>): Promise<Participant | undefined>;
  deleteParticipant(id: string): Promise<boolean>;
  bulkCreateParticipants(participants: InsertParticipant[]): Promise<Participant[]>;

  // Reassignment management
  createReassignment(reassignment: InsertReassignment): Promise<Reassignment>;
  getReassignmentsByParticipant(participantId: string): Promise<Reassignment[]>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: AuditFilters): Promise<AuditLog[]>;

  // Dashboard statistics
  getDashboardStats(): Promise<DashboardStats>;
}

export interface ParticipantFilters {
  search?: string;
  discipline?: string;
  role?: string;
  checkinStatus?: string;
  hotelId?: string;
  district?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditFilters {
  userId?: string;
  actionType?: string;
  targetEntity?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface DashboardStats {
  totalParticipants: number;
  totalTeams: number;
  totalPlayers: number;
  checkedInCount: number;
  checkedOutCount: number;
  pendingActions: number;
  totalHotels: number;
  totalAvailableRooms: number;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  estimatedRoomsNeeded: number;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByMobile(mobileNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber));
    return user || undefined;
  }

  async getUserByCoachId(coachId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.coachId, coachId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getHotels(): Promise<Hotel[]> {
    return await db.select().from(hotels).orderBy(asc(hotels.hotelId), asc(hotels.instanceCode));
  }

  async getHotelById(id: string): Promise<Hotel | undefined> {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, id));
    return hotel || undefined;
  }

  async getHotelByHotelIdAndInstance(hotelId: string, instanceCode: string): Promise<Hotel | undefined> {
    const [hotel] = await db
      .select()
      .from(hotels)
      .where(and(eq(hotels.hotelId, hotelId), eq(hotels.instanceCode, instanceCode)));
    return hotel || undefined;
  }

  async createHotel(insertHotel: InsertHotel): Promise<Hotel> {
    const [hotel] = await db.insert(hotels).values(insertHotel).returning();
    return hotel;
  }

  async updateHotel(id: string, updates: Partial<InsertHotel>): Promise<Hotel | undefined> {
    const [hotel] = await db
      .update(hotels)
      .set(updates)
      .where(eq(hotels.id, id))
      .returning();
    return hotel || undefined;
  }

  async deleteHotel(id: string): Promise<boolean> {
    const result = await db.delete(hotels).where(eq(hotels.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getHotelsWithOverlappingDates(hotelId: string, startDate: Date, endDate: Date): Promise<Hotel[]> {
    return await db
      .select()
      .from(hotels)
      .where(
        and(
          eq(hotels.hotelId, hotelId),
          or(
            and(gte(hotels.startDate, startDate), lte(hotels.startDate, endDate)),
            and(gte(hotels.endDate, startDate), lte(hotels.endDate, endDate)),
            and(lte(hotels.startDate, startDate), gte(hotels.endDate, endDate))
          )
        )
      );
  }

  async checkHotelDateConflicts(hotelId: string, excludeInstanceCode: string, startDate: Date, endDate: Date): Promise<Hotel[]> {
    return await db
      .select()
      .from(hotels)
      .where(
        and(
          eq(hotels.hotelId, hotelId),
          sql`${hotels.instanceCode} != ${excludeInstanceCode}`,
          or(
            and(gte(hotels.startDate, startDate), lte(hotels.startDate, endDate)),
            and(gte(hotels.endDate, startDate), lte(hotels.endDate, endDate)),
            and(lte(hotels.startDate, startDate), gte(hotels.endDate, endDate))
          )
        )
      );
  }

  async getParticipants(filters: ParticipantFilters = {}): Promise<Participant[]> {
    let query = db.select().from(participants);
    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          like(participants.name, `%${filters.search}%`),
          like(participants.participantId, `%${filters.search}%`),
          like(participants.mobileNumber, `%${filters.search}%`)
        )
      );
    }

    if (filters.discipline) {
      conditions.push(eq(participants.discipline, filters.discipline));
    }

    if (filters.role) {
      conditions.push(sql`${participants.role} = ${filters.role}`);
    }

    if (filters.checkinStatus) {
      conditions.push(sql`${participants.checkinStatus} = ${filters.checkinStatus}`);
    }

    if (filters.hotelId) {
      conditions.push(eq(participants.hotelId, filters.hotelId));
    }

    if (filters.district) {
      conditions.push(eq(participants.district, filters.district));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sorting
    const sortOrder = filters.sortOrder || 'desc';
    
    if (sortOrder === 'asc') {
      query = query.orderBy(asc(participants.createdAt));
    } else {
      query = query.orderBy(desc(participants.createdAt));
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
      if (filters.page && filters.page > 1) {
        query = query.offset((filters.page - 1) * filters.limit);
      }
    }

    return await query.execute();
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.id, id));
    return participant || undefined;
  }

  async getParticipantByParticipantId(participantId: string): Promise<Participant | undefined> {
    const [participant] = await db.select().from(participants).where(eq(participants.participantId, participantId));
    return participant || undefined;
  }

  async getParticipantsByCoachId(coachId: string): Promise<Participant[]> {
    return await db
      .select()
      .from(participants)
      .where(eq(participants.coachId, coachId))
      .orderBy(asc(participants.name));
  }

  async createParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const [participant] = await db.insert(participants).values(insertParticipant).returning();
    return participant;
  }

  async updateParticipant(id: string, updates: Partial<InsertParticipant>): Promise<Participant | undefined> {
    const [participant] = await db
      .update(participants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(participants.id, id))
      .returning();
    return participant || undefined;
  }

  async deleteParticipant(id: string): Promise<boolean> {
    const result = await db.delete(participants).where(eq(participants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async bulkCreateParticipants(insertParticipants: InsertParticipant[]): Promise<Participant[]> {
    return await db.insert(participants).values(insertParticipants).returning();
  }

  async createReassignment(insertReassignment: InsertReassignment): Promise<Reassignment> {
    const [reassignment] = await db.insert(reassignments).values(insertReassignment).returning();
    return reassignment;
  }

  async getReassignmentsByParticipant(participantId: string): Promise<Reassignment[]> {
    return await db
      .select()
      .from(reassignments)
      .where(eq(reassignments.originalParticipantId, participantId))
      .orderBy(desc(reassignments.reassignedAt));
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(insertAuditLog).returning();
    return log;
  }

  async getAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
    let query = db.select().from(auditLog);
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }

    if (filters.actionType) {
      conditions.push(eq(auditLog.actionType, filters.actionType));
    }

    if (filters.targetEntity) {
      conditions.push(eq(auditLog.targetEntity, filters.targetEntity));
    }

    if (filters.fromDate) {
      conditions.push(gte(auditLog.timestamp, filters.fromDate));
    }

    if (filters.toDate) {
      conditions.push(lte(auditLog.timestamp, filters.toDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(auditLog.timestamp)).execute();
  }

  async getDashboardStats(date?: string): Promise<DashboardStats> {
    // Get total participants
    const totalParticipants = await db.select().from(participants);
    
    // Get checked in count
    const checkedInParticipants = await db
      .select()
      .from(participants)
      .where(sql`${participants.checkinStatus} = 'checked_in'`);

    // Get checked out count
    const checkedOutParticipants = await db
      .select()
      .from(participants)
      .where(sql`${participants.checkinStatus} = 'checked_out'`);

    // Get pending actions (participants with pending status)
    const pendingParticipants = await db
      .select()
      .from(participants)
      .where(sql`${participants.checkinStatus} = 'pending'`);

    // Get team and player counts
    const teams = await db.selectDistinct({ teamName: participants.teamName }).from(participants).where(isNotNull(participants.teamName));
    const players = await db.select().from(participants).where(eq(participants.role, 'player'));

    // Get hotel statistics
    const allHotels = await db.select().from(hotels);
    const totalAvailableRooms = allHotels.reduce((sum, hotel) => sum + hotel.availableRooms, 0);

    // Calculate estimated rooms needed (1 room per 3 players, 1 per 2 coaches, 1 per official)
    const playerCount = totalParticipants.filter((p: any) => p.role === 'player').length;
    const coachCount = totalParticipants.filter((p: any) => p.role === 'coach').length;
    const officialCount = totalParticipants.filter((p: any) => p.role === 'official').length;
    
    const estimatedRoomsNeeded = Math.ceil(playerCount / 3) + Math.ceil(coachCount / 2) + officialCount;

    const totalRooms = allHotels.reduce((sum, hotel) => sum + hotel.totalRooms, 0);
    const occupiedRooms = allHotels.reduce((sum, hotel) => sum + (hotel.occupiedRooms || 0), 0);
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      totalParticipants: totalParticipants.length,
      totalTeams: teams.length,
      totalPlayers: players.length,
      checkedInCount: checkedInParticipants.length,
      checkedOutCount: checkedOutParticipants.length,
      pendingActions: pendingParticipants.length,
      totalHotels: allHotels.length,
      totalAvailableRooms: totalAvailableRooms,
      totalRooms: totalRooms,
      occupiedRooms: occupiedRooms,
      occupancyRate: Math.round(occupancyRate),
      estimatedRoomsNeeded,
    };
  }
}

export const storage = new DatabaseStorage();
