export interface User {
  id: string;
  name: string;
  role: 'admin' | 'coach';
  coachId?: string;
}

export interface DashboardStats {
  totalParticipants: number;
  checkedInCount: number;
  pendingActions: number;
  availableRooms: number;
  totalHotels: number;
  estimatedRoomsNeeded: number;
}

export interface Participant {
  id: string;
  participantId: string;
  name: string;
  mobileNumber?: string;
  role: 'coach' | 'official' | 'player';
  discipline: string;
  district?: string;
  teamName?: string;
  coachId?: string;
  hotelId: string;
  hotelName: string;
  stadium?: string;
  bookingStartDate: string;
  bookingEndDate: string;
  bookingReference: string;
  transportPoc?: string;
  checkinStatus: 'pending' | 'checked_in' | 'checked_out';
  checkinTime?: string;
  checkoutTime?: string;
  actualCheckoutDate?: string;
}

export interface Hotel {
  id: string;
  hotelId: string;
  instanceCode: string;
  hotelName: string;
  location: string;
  district: string;
  address: string;
  pincode: string;
  startDate: string;
  endDate: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
}

export interface UploadResult {
  success: boolean;
  created: number;
  errors: string[];
  warnings: string[];
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
