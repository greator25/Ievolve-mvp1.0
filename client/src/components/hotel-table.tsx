import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building2, MapPin, Users, Bed } from "lucide-react";

interface Hotel {
  id: string;
  hotelId: string;
  hotelName: string;
  location: string;
  district: string;
  totalRooms: number;
  availableRooms: number;
  instanceCode: string;
  dateFrom: string;
  dateTo: string;
  pricePerDay: number;
  maxOccupancy: number;
  amenities: string[];
}

interface GroupedHotel {
  id: string;
  hotelId: string;
  hotelName: string;
  location: string;
  district: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  instances: Hotel[];
  dateRange: { from: string; to: string };
}

const getOccupancyStatus = (occupied: number, total: number) => {
  const percentage = (occupied / total) * 100;
  if (percentage >= 90) return { label: "Full", variant: "destructive", color: "red-500" };
  if (percentage >= 70) return { label: "High", variant: "warning", color: "yellow-500" };
  if (percentage >= 30) return { label: "Medium", variant: "default", color: "blue-500" };
  return { label: "Low", variant: "success", color: "green-500" };
};

export default function HotelTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: hotels = [], isLoading, error } = useQuery<Hotel[]>({
    queryKey: ["/api/admin/dashboard/hotels"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hotel Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading hotels...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hotel Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-red-500">Error loading hotels</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group hotels by hotelId and combine instances
  const hotelGroups: Record<string, GroupedHotel> = {};
  
  hotels.forEach((hotel) => {
    if (!hotelGroups[hotel.hotelId]) {
      hotelGroups[hotel.hotelId] = {
        id: hotel.id,
        hotelId: hotel.hotelId,
        hotelName: hotel.hotelName,
        location: hotel.location,
        district: hotel.district,
        totalRooms: 0,
        occupiedRooms: 0,
        availableRooms: 0,
        instances: [],
        dateRange: { from: hotel.dateFrom, to: hotel.dateTo }
      };
    }

    const group = hotelGroups[hotel.hotelId];
    group.instances.push(hotel);
    group.totalRooms += hotel.totalRooms;
    group.availableRooms += hotel.availableRooms;
    group.occupiedRooms += (hotel.totalRooms - hotel.availableRooms);
    

    
    // Update date range
    if (new Date(hotel.dateFrom) < new Date(group.dateRange.from)) {
      group.dateRange.from = hotel.dateFrom;
    }
    if (new Date(hotel.dateTo) > new Date(group.dateRange.to)) {
      group.dateRange.to = hotel.dateTo;
    }
  });

  const displayHotels = Object.values(hotelGroups);

  // Get unique districts for filter
  const districts = Array.from(new Set(hotels.map(h => h.district)));

  // Filter hotels based on search and filters
  const filteredHotels = displayHotels.filter(hotel => {
    const matchesSearch = hotel.hotelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hotel.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hotel.hotelId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDistrict = districtFilter === "all" || hotel.district === districtFilter;
    
    const status = getOccupancyStatus(hotel.occupiedRooms, hotel.totalRooms);
    const matchesStatus = statusFilter === "all" || status.label.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesDistrict && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Hotel Inventory Overview
          </CardTitle>
          <Badge variant="outline" className="text-sm">
            {displayHotels.length} Hotels • {hotels.length} Instances
          </Badge>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search hotels, locations, or IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-hotel-search"
            />
          </div>
          
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map(district => (
                <SelectItem key={district} value={district}>{district}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Hotel Details</TableHead>
                <TableHead className="w-[150px]">Location</TableHead>
                <TableHead className="w-[120px]">Occupancy</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Instances</TableHead>
                <TableHead className="w-[150px]">Date Range</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {displayHotels.length === 0 ? "No hotels found" : "No hotels match the current filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredHotels.map((hotel) => {
                  const occupancyPercentage = Math.round((hotel.occupiedRooms / hotel.totalRooms) * 100);
                  const status = getOccupancyStatus(hotel.occupiedRooms, hotel.totalRooms);
                  
                  return (
                    <TableRow key={hotel.hotelId} data-testid={`hotel-row-${hotel.hotelId}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900" data-testid={`hotel-name-${hotel.hotelId}`}>
                            {hotel.hotelName}
                          </div>
                          <div className="text-sm text-gray-500" data-testid={`hotel-id-${hotel.hotelId}`}>
                            ID: {hotel.hotelId}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{hotel.location}</div>
                            <div className="text-xs text-gray-500">{hotel.district}</div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium" data-testid={`hotel-occupancy-${hotel.hotelId}`}>
                              {hotel.occupiedRooms}/{hotel.totalRooms}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`bg-${status.color} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${occupancyPercentage}%` }}
                              data-testid={`hotel-progress-${hotel.hotelId}`}
                            />
                          </div>
                          <div className="text-xs text-gray-500">{occupancyPercentage}%</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant={
                            status.variant === 'destructive' ? 'destructive' :
                            status.variant === 'warning' ? 'secondary' :
                            status.variant === 'success' ? 'default' : 'outline'
                          }
                          data-testid={`hotel-status-${hotel.hotelId}`}
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{hotel.instances.length}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {new Date(hotel.dateRange.from).toLocaleDateString()}
                          </div>
                          <div className="text-gray-500">to</div>
                          <div className="font-medium">
                            {new Date(hotel.dateRange.to).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredHotels.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 border-t pt-4">
            Showing {filteredHotels.length} of {displayHotels.length} hotels
          </div>
        )}
      </CardContent>
    </Card>
  );
}