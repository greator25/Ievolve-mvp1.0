import { storage } from "../storage";
import { type InsertHotel, type InsertParticipant, type InsertUser } from "@shared/schema";
import { AuthService } from "./auth";

export interface UploadResult {
  success: boolean;
  created: number;
  errors: string[];
  warnings: string[];
}

export class UploadService {
  // Parse PSV (Pipe Separated Values) content
  static parsePSV(content: string): string[][] {
    const lines = content.trim().split('\n');
    return lines.map(line => line.split('|').map(cell => cell.trim()));
  }

  // Upload Hotel Inventory Sheet
  static async uploadHotelInventory(content: string): Promise<UploadResult> {
    const result: UploadResult = {
      success: true,
      created: 0,
      errors: [],
      warnings: [],
    };

    try {
      const rows = this.parsePSV(content);
      const headers = rows[0];
      
      // Validate headers
      const expectedHeaders = [
        'HotelID', 'InstanceCode', 'HotelName', 'Location', 'District',
        'Address', 'Pincode', 'StartDate', 'EndDate', 'TotalRooms',
        'OccupiedRooms', 'AvailableRooms'
      ];

      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length !== headers.length) {
          result.errors.push(`Row ${i + 1}: Invalid column count`);
          continue;
        }

        const hotelData: any = {};
        headers.forEach((header, index) => {
          hotelData[header] = row[index];
        });

        try {
          // Validate required fields
          if (!hotelData.HotelID || !hotelData.InstanceCode) {
            result.errors.push(`Row ${i + 1}: Missing HotelID or InstanceCode`);
            continue;
          }

          // Check for overlapping dates
          const startDate = new Date(hotelData.StartDate);
          const endDate = new Date(hotelData.EndDate);
          
          const overlapping = await storage.getHotelsWithOverlappingDates(
            hotelData.HotelID,
            startDate,
            endDate
          );

          if (overlapping.length > 0) {
            result.errors.push(
              `Row ${i + 1}: Hotel ${hotelData.HotelID} has overlapping dates with existing records`
            );
            continue;
          }

          // Check for existing hotel with same ID and instance
          const existing = await storage.getHotelByHotelIdAndInstance(
            hotelData.HotelID,
            hotelData.InstanceCode
          );

          if (existing) {
            result.warnings.push(
              `Row ${i + 1}: Hotel ${hotelData.HotelID} with instance ${hotelData.InstanceCode} already exists`
            );
            continue;
          }

          const insertHotel: InsertHotel = {
            hotelId: hotelData.HotelID,
            instanceCode: hotelData.InstanceCode,
            hotelName: hotelData.HotelName,
            location: hotelData.Location,
            district: hotelData.District,
            address: hotelData.Address,
            pincode: hotelData.Pincode,
            startDate,
            endDate,
            totalRooms: parseInt(hotelData.TotalRooms),
            occupiedRooms: parseInt(hotelData.OccupiedRooms),
            availableRooms: parseInt(hotelData.AvailableRooms),
          };

          await storage.createHotel(insertHotel);
          result.created++;
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  // Upload Coach and Official Data Sheet
  static async uploadCoachesOfficials(content: string): Promise<UploadResult> {
    const result: UploadResult = {
      success: true,
      created: 0,
      errors: [],
      warnings: [],
    };

    try {
      const rows = this.parsePSV(content);
      const headers = rows[0];
      
      const expectedHeaders = [
        'ROLE', 'COACH_id', 'Name', 'Mobile_Number', 'Discipline',
        'Hotel_ID', 'Hotel_Name', 'Stadium', 'Booking_Start_Date',
        'Booking_End_Date', 'Booking_Reference_Number', 'Transport POC'
      ];

      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        result.errors.push(`Missing headers: ${missingHeaders.join(', ')}`);
        result.success = false;
        return result;
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const data: any = {};
        headers.forEach((header, index) => {
          data[header] = row[index];
        });

        try {
          // Validate hotel exists
          const hotel = await storage.getHotelByHotelIdAndInstance(data.Hotel_ID, '1');
          if (!hotel) {
            result.errors.push(`Row ${i + 1}: Hotel ${data.Hotel_ID} not found in inventory`);
            continue;
          }

          // Validate minimum 3-day stay
          const startDate = new Date(data.Booking_Start_Date);
          const endDate = new Date(data.Booking_End_Date);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
          
          if (daysDiff < 3) {
            result.errors.push(`Row ${i + 1}: Booking duration must be at least 3 days`);
            continue;
          }

          // Check if participant already exists
          const existing = await storage.getParticipantByParticipantId(data.COACH_id);
          if (existing) {
            result.warnings.push(`Row ${i + 1}: Participant ${data.COACH_id} already exists`);
            continue;
          }

          // Create coach user account if role is COACH
          if (data.ROLE === 'COACH') {
            const existingUser = await storage.getUserByCoachId(data.COACH_id);
            if (!existingUser) {
              await storage.createUser({
                mobileNumber: data.Mobile_Number,
                name: data.Name,
                role: "coach",
                coachId: data.COACH_id,
                isActive: true,
              });
            }
          }

          const insertParticipant: InsertParticipant = {
            participantId: data.COACH_id,
            name: data.Name,
            mobileNumber: data.Mobile_Number,
            role: data.ROLE.toLowerCase() as "coach" | "official",
            discipline: data.Discipline,
            hotelId: data.Hotel_ID,
            hotelName: data.Hotel_Name,
            stadium: data.Stadium,
            bookingStartDate: startDate,
            bookingEndDate: endDate,
            bookingReference: data.Booking_Reference_Number,
            transportPoc: data['Transport POC'],
            checkinStatus: data.ROLE === 'OFFICIAL' ? 'checked_in' : 'pending',
          };

          await storage.createParticipant(insertParticipant);
          result.created++;
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  // Upload Player Data Sheet
  static async uploadPlayers(content: string): Promise<UploadResult> {
    const result: UploadResult = {
      success: true,
      created: 0,
      errors: [],
      warnings: [],
    };

    try {
      const rows = this.parsePSV(content);
      const headers = rows[0];
      
      const expectedHeaders = [
        'COACH_ID', 'PlayerID', 'Player_Name', 'Mobilenumber',
        'Discipline', 'District', 'Team_Name', 'Location',
        'HOTEL_id', 'BOOKING_REFERENCE', 'Booking_Start_Date', 'Booking_End_Date'
      ];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const data: any = {};
        headers.forEach((header, index) => {
          data[header] = row[index];
        });

        try {
          // Validate coach exists
          const coach = await storage.getUserByCoachId(data.COACH_ID);
          if (!coach) {
            result.errors.push(`Row ${i + 1}: Coach ${data.COACH_ID} not found`);
            continue;
          }

          // Validate hotel exists
          const hotel = await storage.getHotelByHotelIdAndInstance(data.HOTEL_id, '1');
          if (!hotel) {
            result.errors.push(`Row ${i + 1}: Hotel ${data.HOTEL_id} not found in inventory`);
            continue;
          }

          // Validate minimum 3-day stay
          const startDate = new Date(data.Booking_Start_Date);
          const endDate = new Date(data.Booking_End_Date);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
          
          if (daysDiff < 3) {
            result.errors.push(`Row ${i + 1}: Booking duration must be at least 3 days`);
            continue;
          }

          // Check if player already exists
          const existing = await storage.getParticipantByParticipantId(data.PlayerID);
          if (existing) {
            result.warnings.push(`Row ${i + 1}: Player ${data.PlayerID} already exists`);
            continue;
          }

          const insertParticipant: InsertParticipant = {
            participantId: data.PlayerID,
            name: data.Player_Name,
            mobileNumber: data.Mobilenumber || null,
            role: "player",
            discipline: data.Discipline,
            district: data.District,
            teamName: data.Team_Name,
            coachId: data.COACH_ID,
            hotelId: data.HOTEL_id,
            hotelName: data.Location,
            bookingStartDate: startDate,
            bookingEndDate: endDate,
            bookingReference: data.BOOKING_REFERENCE,
            checkinStatus: "pending",
          };

          await storage.createParticipant(insertParticipant);
          result.created++;
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }
}
