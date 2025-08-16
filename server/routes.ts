import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { AuthService } from "./services/auth";
import { UploadService } from "./services/upload";
import { NotificationService } from "./services/notification";
import { 
  loginSchema, uploadFileSchema, checkinSchema, checkoutSchema,
  otpRequestSchema, otpVerifySchema, updateHotelSchema, calculateHotelStatus,
  type User, type Participant, type Hotel, type UpdateHotel 
} from "@shared/schema";
import multer from "multer";
import { z } from "zod";

const PgSession = ConnectPgSimple(session);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'text/plain' || file.originalname.endsWith('.psv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PSV files are allowed'));
    }
  },
});

declare module 'express-session' {
  interface SessionData {
    user: User;
    userId: string;
  }
}

// Middleware to check authentication
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.user && !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Middleware to check admin role
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Middleware to check coach role
const requireCoach = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.user || req.session.user.role !== "coach") {
    return res.status(403).json({ message: "Coach access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Initialize default admin
  await AuthService.createDefaultAdmin();

  // Authentication routes
  
  // Admin login step 1: email/password verification + OTP send
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await AuthService.loginAdminStep1(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Admin login step 2: OTP verification
  app.post("/api/auth/admin/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = otpVerifySchema.parse(req.body);
      
      if (!mobileNumber || !otp) {
        return res.status(400).json({ message: "Mobile number and OTP are required" });
      }

      const user = await AuthService.loginAdminStep2(mobileNumber, otp);
      req.session.userId = user.id;
      req.session.user = user;
      
      await storage.createAuditLog({
        userId: user.id,
        actionType: "login",
        targetEntity: "user",
        targetId: user.id,
        details: { method: "admin_2fa_login", mobileNumber },
      });

      res.json({ user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
      res.status(401).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Coach login step 1: mobile number + OTP send
  app.post("/api/auth/coach/login", async (req, res) => {
    try {
      const { mobileNumber } = loginSchema.parse(req.body);
      
      if (!mobileNumber) {
        return res.status(400).json({ message: "Mobile number required" });
      }

      const result = await AuthService.loginCoach(mobileNumber);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to send OTP" });
    }
  });

  // Coach login step 2: OTP verification
  app.post("/api/auth/coach/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = otpVerifySchema.parse(req.body);
      
      if (!mobileNumber || !otp) {
        return res.status(400).json({ message: "Mobile number and OTP required" });
      }

      const user = await AuthService.verifyCoachOTP(mobileNumber, otp);
      req.session.userId = user.id;
      req.session.user = user;
      
      // Force session save
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      
      console.log('Coach session saved:', {
        userId: req.session.userId,
        userRole: req.session.user?.role,
        coachId: req.session.user?.coachId,
        sessionId: req.sessionID
      });

      await storage.createAuditLog({
        userId: user.id,
        actionType: "login",
        targetEntity: "user",
        targetId: user.id,
        details: { method: "coach_otp_login", mobileNumber },
      });

      res.json({ user: { id: user.id, name: user.name, role: user.role, coachId: user.coachId } });
    } catch (error) {
      res.status(401).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Resend OTP for both admin and coach
  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { mobileNumber, purpose } = otpRequestSchema.parse(req.body);
      
      if (!mobileNumber || !purpose) {
        return res.status(400).json({ message: "Mobile number and purpose required" });
      }

      const result = await AuthService.resendOTP(mobileNumber, purpose);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to resend OTP" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const userId = req.session.user!.id;
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    console.log('Session check:', {
      hasUser: !!req.session.user,
      userId: req.session.userId,
      userRole: req.session.user?.role,
      sessionId: req.sessionID
    });
    
    if (req.session.user) {
      const { id, name, role, coachId } = req.session.user;
      res.json({ user: { id, name, role, coachId } });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Data upload routes (Admin only)
  app.post("/api/admin/upload/hotel-inventory", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const content = req.file.buffer.toString('utf-8');
      const result = await UploadService.uploadHotelInventory(content);

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "upload",
        targetEntity: "hotel",
        details: { type: "hotel_inventory", result },
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  app.post("/api/admin/upload/coaches-officials", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const content = req.file.buffer.toString('utf-8');
      const result = await UploadService.uploadCoachesOfficials(content);

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "upload",
        targetEntity: "participant",
        details: { type: "coaches_officials", result },
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  app.post("/api/admin/upload/players", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const content = req.file.buffer.toString('utf-8');
      const result = await UploadService.uploadPlayers(content);

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "upload",
        targetEntity: "participant",
        details: { type: "players", result },
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Upload failed" });
    }
  });

  // Dashboard routes
  app.get("/api/admin/dashboard/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get stats" });
    }
  });

  app.get("/api/admin/dashboard/participants", requireAdmin, async (req, res) => {
    try {
      const filters = req.query;
      const participants = await storage.getParticipants(filters);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get participants" });
    }
  });

  app.get("/api/admin/dashboard/hotels", requireAdmin, async (req, res) => {
    try {
      const { search, district, status, sortBy, sortOrder } = req.query;
      
      const filters = {
        search: search as string,
        district: district as string,
        status: status as "upcoming" | "active" | "expired",
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc"
      };
      
      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined || filters[key as keyof typeof filters] === "") {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const hotels = await storage.getHotels(filters);
      
      // Add computed status to each hotel
      const hotelsWithStatus = hotels.map(hotel => ({
        ...hotel,
        status: calculateHotelStatus(hotel.startDate, hotel.endDate)
      }));
      
      res.json(hotelsWithStatus);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get hotels" });
    }
  });

  // Hotel management endpoints
  app.get("/api/admin/hotels/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const hotel = await storage.getHotelById(id);
      
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      
      res.json(hotel);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get hotel" });
    }
  });

  app.put("/api/admin/hotels/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Hotel update request:', { id, body: req.body });
      
      const updates = updateHotelSchema.parse(req.body);
      console.log('Parsed updates:', updates);
      
      // Get original hotel for audit logging
      const originalHotel = await storage.getHotelById(id);
      if (!originalHotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      // The dates are already Date objects from the schema transformation
      const startDate = updates.startDate;
      const endDate = updates.endDate;

      // Only check for date conflicts if dates are actually being changed
      const datesChanged = (
        startDate.getTime() !== new Date(originalHotel.startDate).getTime() ||
        endDate.getTime() !== new Date(originalHotel.endDate).getTime()
      );

      let conflictingHotels: any[] = [];
      if (datesChanged) {
        conflictingHotels = await storage.checkHotelDateConflicts(
          originalHotel.hotelId,
          originalHotel.instanceCode,
          startDate,
          endDate
        );
      }

      if (conflictingHotels.length > 0) {
        const conflictDetails = conflictingHotels.map(h => {
          const start = new Date(h.startDate).toLocaleDateString();
          const end = new Date(h.endDate).toLocaleDateString();
          return `Instance ${h.instanceCode} (${start} - ${end})`;
        }).join(', ');
        
        return res.status(400).json({ 
          message: `Date range conflicts with existing hotel instances: ${conflictDetails}. Please choose non-overlapping dates.`,
          conflicts: conflictingHotels.map(h => ({ 
            id: h.id, 
            instanceCode: h.instanceCode, 
            startDate: h.startDate, 
            endDate: h.endDate 
          }))
        });
      }

      // Updates already contain properly converted dates
      const updateData = updates;

      // Detect field changes for audit logging
      const changes: Record<string, { from: any; to: any }> = {};
      Object.keys(updateData).forEach(key => {
        const newValue = updateData[key as keyof typeof updateData];
        const oldValue = originalHotel[key as keyof typeof originalHotel];
        
        // Compare values (handle dates specially)
        let isChanged = false;
        if (key === 'startDate' || key === 'endDate') {
          const newDate = new Date(newValue as Date).toISOString();
          const oldDate = new Date(oldValue as Date).toISOString();
          isChanged = newDate !== oldDate;
        } else {
          isChanged = newValue !== oldValue;
        }
        
        if (isChanged) {
          changes[key] = { from: oldValue, to: newValue };
        }
      });

      // Only update if there are actual changes
      if (Object.keys(changes).length === 0) {
        return res.json({ message: "No changes detected", hotel: originalHotel });
      }

      // Separate changes into instance-specific and property-wide changes
      const propertyWideFields = ['address', 'location', 'pincode', 'district'];
      const propertyWideChanges: Record<string, any> = {};
      const instanceSpecificChanges: Record<string, any> = {};

      Object.keys(changes).forEach(field => {
        if (propertyWideFields.includes(field)) {
          propertyWideChanges[field] = updateData[field as keyof typeof updateData];
        } else {
          instanceSpecificChanges[field] = updateData[field as keyof typeof updateData];
        }
      });

      let updatedHotels: any[] = [];

      // Update property-wide changes across all instances of the same hotel
      if (Object.keys(propertyWideChanges).length > 0) {
        updatedHotels = await storage.updateHotelsByHotelId(originalHotel.hotelId, propertyWideChanges);
        
        // Log property-wide changes
        await storage.createAuditLog({
          userId: req.session.user!.id,
          actionType: "edit",
          targetEntity: "hotel",
          targetId: originalHotel.hotelId,
          details: { 
            hotelId: originalHotel.hotelId,
            action: "property_wide_update",
            affectedInstances: updatedHotels.length,
            changes: Object.keys(propertyWideChanges).reduce((acc, field) => {
              acc[field] = { from: originalHotel[field as keyof typeof originalHotel], to: propertyWideChanges[field] };
              return acc;
            }, {} as Record<string, any>),
            changedFields: Object.keys(propertyWideChanges)
          },
        });
      }

      // Update instance-specific changes only for this instance
      let updatedHotel = originalHotel;
      if (Object.keys(instanceSpecificChanges).length > 0) {
        const result = await storage.updateHotel(id, instanceSpecificChanges);
        
        if (!result) {
          return res.status(404).json({ message: "Hotel not found or update failed" });
        }
        updatedHotel = result;

        // Log instance-specific changes
        await storage.createAuditLog({
          userId: req.session.user!.id,
          actionType: "edit",
          targetEntity: "hotel",
          targetId: id,
          details: { 
            hotelId: originalHotel.hotelId,
            instanceCode: originalHotel.instanceCode,
            action: "instance_specific_update",
            changes: Object.keys(instanceSpecificChanges).reduce((acc, field) => {
              acc[field] = { from: originalHotel[field as keyof typeof originalHotel], to: instanceSpecificChanges[field] };
              return acc;
            }, {} as Record<string, any>),
            changedFields: Object.keys(instanceSpecificChanges)
          },
        });
      }

      console.log('Hotel updated successfully:', updatedHotel.id);

      const affectedInstances = Object.keys(propertyWideChanges).length > 0 ? updatedHotels.length : 1;
      
      res.json({ 
        message: `Hotel updated successfully${affectedInstances > 1 ? ` (${affectedInstances} instances affected)` : ''}`, 
        hotel: updatedHotel,
        changes: Object.keys(changes),
        affectedInstances
      });
    } catch (error) {
      console.error('Hotel update error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update hotel" });
    }
  });

  // Coach dashboard routes
  app.get("/api/coach/dashboard", requireCoach, async (req, res) => {
    try {
      const coachId = req.session.user!.coachId;
      console.log('Coach dashboard request:', {
        userId: req.session.user!.id,
        coachId,
        sessionId: req.sessionID
      });
      
      if (!coachId) {
        return res.status(400).json({ message: "Coach ID not found" });
      }

      // Batch database queries for better performance
      const [players, coach] = await Promise.all([
        storage.getParticipantsByCoachId(coachId),
        storage.getParticipantByParticipantId(coachId)
      ]);
      
      console.log('Coach dashboard response:', {
        coachFound: !!coach,
        playersCount: players.length,
        coachData: coach ? { id: coach.id, name: coach.name, role: coach.role } : null
      });
      
      res.json({ coach, players });
    } catch (error) {
      console.error('Coach dashboard error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get dashboard data" });
    }
  });

  // Check-in/Check-out routes
  app.post("/api/coach/checkin", requireCoach, async (req, res) => {
    try {
      const { participantIds } = checkinSchema.parse(req.body);
      const coachId = req.session.user!.coachId;
      
      if (!coachId) {
        return res.status(400).json({ message: "Coach ID not found" });
      }

      const checkedInParticipants: Participant[] = [];
      
      for (const participantId of participantIds) {
        const participant = await storage.getParticipantByParticipantId(participantId);
        
        if (!participant) {
          continue;
        }

        // Verify participant belongs to this coach
        if (participant.coachId !== coachId && participant.participantId !== coachId) {
          continue;
        }

        const updated = await storage.updateParticipant(participant.id, {
          checkinStatus: "checked_in",
          checkinTime: new Date(),
        });

        if (updated) {
          checkedInParticipants.push(updated);
        }
      }

      // Send notification to transport POC if coach is checking in players
      const coach = await storage.getParticipantByParticipantId(coachId);
      if (coach && coach.transportPoc && checkedInParticipants.length > 0) {
        const playerCount = checkedInParticipants.filter(p => p.role === 'player').length;
        if (playerCount > 0) {
          await NotificationService.sendCheckinNotification(
            coach.transportPoc,
            coachId,
            playerCount,
            new Date().toLocaleString()
          );
        }
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "checkin",
        targetEntity: "participant",
        details: { participantIds, checkedInCount: checkedInParticipants.length },
      });

      res.json({ 
        message: "Check-in successful", 
        checkedIn: checkedInParticipants.length,
        participants: checkedInParticipants 
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Check-in failed" });
    }
  });

  app.post("/api/coach/checkout", requireCoach, async (req, res) => {
    try {
      const { participantIds, newCheckoutDate } = checkoutSchema.parse(req.body);
      const coachId = req.session.user!.coachId;
      
      if (!coachId) {
        return res.status(400).json({ message: "Coach ID not found" });
      }

      const checkedOutParticipants: Participant[] = [];
      
      for (const participantId of participantIds) {
        const participant = await storage.getParticipantByParticipantId(participantId);
        
        if (!participant) {
          continue;
        }

        // Verify participant belongs to this coach
        if (participant.coachId !== coachId && participant.participantId !== coachId) {
          continue;
        }

        // Validate new checkout date is not after original end date
        if (newCheckoutDate) {
          const newDate = new Date(newCheckoutDate);
          if (newDate > participant.bookingEndDate) {
            continue;
          }
        }

        const updated = await storage.updateParticipant(participant.id, {
          checkinStatus: "checked_out",
          checkoutTime: new Date(),
          actualCheckoutDate: newCheckoutDate ? new Date(newCheckoutDate) : undefined,
        });

        if (updated) {
          checkedOutParticipants.push(updated);
        }
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "checkout",
        targetEntity: "participant",
        details: { participantIds, checkedOutCount: checkedOutParticipants.length, newCheckoutDate },
      });

      res.json({ 
        message: "Check-out successful", 
        checkedOut: checkedOutParticipants.length,
        participants: checkedOutParticipants 
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Check-out failed" });
    }
  });

  // Admin check-in/check-out endpoints
  app.post("/api/admin/checkin", requireAdmin, async (req, res) => {
    try {
      const { participantIds } = checkinSchema.parse(req.body);
      
      const checkedInParticipants: Participant[] = [];
      
      for (const participantId of participantIds) {
        const participant = await storage.getParticipantByParticipantId(participantId);
        
        if (!participant) {
          continue;
        }

        const updated = await storage.updateParticipant(participant.id, {
          checkinStatus: "checked_in",
          checkinTime: new Date(),
        });

        if (updated) {
          checkedInParticipants.push(updated);
        }
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "checkin",
        targetEntity: "participant",
        details: { participantIds, checkedInCount: checkedInParticipants.length },
      });

      res.json({ 
        message: "Check-in successful", 
        checkedIn: checkedInParticipants.length,
        participants: checkedInParticipants 
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Check-in failed" });
    }
  });

  app.post("/api/admin/checkout", requireAdmin, async (req, res) => {
    try {
      const { participantIds, newCheckoutDate } = checkoutSchema.parse(req.body);
      
      const checkedOutParticipants: Participant[] = [];
      
      for (const participantId of participantIds) {
        const participant = await storage.getParticipantByParticipantId(participantId);
        
        if (!participant) {
          continue;
        }

        // Validate new checkout date is not after original end date
        if (newCheckoutDate) {
          const newDate = new Date(newCheckoutDate);
          if (newDate > participant.bookingEndDate) {
            continue;
          }
        }

        const updated = await storage.updateParticipant(participant.id, {
          checkinStatus: "checked_out",
          checkoutTime: new Date(),
          actualCheckoutDate: newCheckoutDate ? new Date(newCheckoutDate) : undefined,
        });

        if (updated) {
          checkedOutParticipants.push(updated);
        }
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "checkout",
        targetEntity: "participant",
        details: { participantIds, checkedOutCount: checkedOutParticipants.length, newCheckoutDate },
      });

      res.json({ 
        message: "Check-out successful", 
        checkedOut: checkedOutParticipants.length,
        participants: checkedOutParticipants 
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Check-out failed" });
    }
  });

  // Checkout dashboard endpoint
  app.get("/api/admin/dashboard/checkout", requireAdmin, async (req, res) => {
    try {
      const participants = await storage.getParticipants();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const checkoutData = participants.map((participant: any) => {
        const bookingEndDate = new Date(participant.bookingEndDate);
        const timeDiff = bookingEndDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
          ...participant,
          daysRemaining,
          isOverdue: daysRemaining < 0 && participant.checkinStatus !== "checked_out"
        };
      }).filter((p: any) => p.checkinStatus === "checked_in" || p.checkinStatus === "checked_out");

      // Calculate stats
      const stats = {
        totalCheckedIn: checkoutData.filter((p: any) => p.checkinStatus === "checked_in").length,
        dueToday: checkoutData.filter((p: any) => p.daysRemaining === 0 && p.checkinStatus === "checked_in").length,
        overdue: checkoutData.filter((p: any) => p.isOverdue).length,
        completed: checkoutData.filter((p: any) => {
          const checkoutDate = p.checkoutTime ? new Date(p.checkoutTime) : null;
          return p.checkinStatus === "checked_out" && checkoutDate && 
                 checkoutDate.toDateString() === today.toDateString();
        }).length
      };

      res.json({ participants: checkoutData, stats });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch checkout data" });
    }
  });

  // Admin early checkout
  app.post("/api/admin/early-checkout", requireAdmin, async (req, res) => {
    try {
      const { participantIds, newCheckoutDate } = checkoutSchema.parse(req.body);
      
      const notifications: Array<{ to: string; message: string }> = [];
      const updatedParticipants: Participant[] = [];
      
      for (const participantId of participantIds) {
        const participant = await storage.getParticipantByParticipantId(participantId);
        
        if (!participant) {
          continue;
        }

        const updated = await storage.updateParticipant(participant.id, {
          actualCheckoutDate: newCheckoutDate ? new Date(newCheckoutDate) : undefined,
        });

        if (updated) {
          updatedParticipants.push(updated);

          // Send notification to participant and coach
          if (participant.mobileNumber) {
            notifications.push({
              to: participant.mobileNumber,
              message: `CM Trophy Update: Your checkout date has been updated to ${newCheckoutDate}. Please plan accordingly. - Ievolve Events`
            });
          }

          // If it's a player, also notify the coach
          if (participant.role === 'player' && participant.coachId) {
            const coach = await storage.getUserByCoachId(participant.coachId);
            if (coach && coach.mobileNumber) {
              notifications.push({
                to: coach.mobileNumber,
                message: `CM Trophy Update: Player ${participant.name}'s checkout date has been updated to ${newCheckoutDate}. - Ievolve Events`
              });
            }
          }
        }
      }

      // Send all notifications
      if (notifications.length > 0) {
        await NotificationService.sendBulkNotifications(notifications);
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "early_checkout",
        targetEntity: "participant",
        details: { participantIds, newCheckoutDate, notificationsSent: notifications.length },
      });

      res.json({ 
        message: "Early checkout processed", 
        updated: updatedParticipants.length,
        notificationsSent: notifications.length 
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Early checkout failed" });
    }
  });

  // Participant management (Admin only)
  app.get("/api/admin/participants/:id", requireAdmin, async (req, res) => {
    try {
      const participant = await storage.getParticipantById(req.params.id);
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      res.json(participant);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get participant" });
    }
  });

  app.put("/api/admin/participants/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateParticipant(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Participant not found" });
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "edit",
        targetEntity: "participant",
        targetId: req.params.id,
        details: req.body,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update participant" });
    }
  });

  app.delete("/api/admin/participants/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteParticipant(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Participant not found" });
      }

      await storage.createAuditLog({
        userId: req.session.user!.id,
        actionType: "delete",
        targetEntity: "participant",
        targetId: req.params.id,
      });

      res.json({ message: "Participant deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete participant" });
    }
  });

  // Export data (Admin only)
  app.get("/api/admin/export/participants", requireAdmin, async (req, res) => {
    try {
      const filters = req.query;
      const participants = await storage.getParticipants(filters);
      
      // Convert to CSV
      const headers = [
        'ID', 'Name', 'Mobile', 'Role', 'Discipline', 'District', 'Team',
        'Hotel ID', 'Hotel Name', 'Booking Reference', 'Start Date', 'End Date',
        'Status', 'Check-in Time', 'Check-out Time'
      ];
      
      const rows = participants.map(p => [
        p.participantId,
        p.name,
        p.mobileNumber || '',
        p.role,
        p.discipline,
        p.district || '',
        p.teamName || '',
        p.hotelId,
        p.hotelName,
        p.bookingReference,
        p.bookingStartDate.toISOString().split('T')[0],
        p.bookingEndDate.toISOString().split('T')[0],
        p.checkinStatus,
        p.checkinTime?.toISOString() || '',
        p.checkoutTime?.toISOString() || ''
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="participants.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Export failed" });
    }
  });

  // Audit logs (Admin only)
  app.get("/api/admin/audit-logs", requireAdmin, async (req, res) => {
    try {
      const filters = req.query;
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
