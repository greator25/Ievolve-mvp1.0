import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Search, Building2, MapPin, Users, Bed, Edit3, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Hotel {
  id: string;
  hotelId: string;
  hotelName: string;
  location: string;
  district: string;
  address: string;
  pincode: string;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  instanceCode: string;
  startDate: string;
  endDate: string;
  createdAt: string;
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

// Hotel edit form schema
const hotelEditSchema = z.object({
  hotelName: z.string().min(1, "Hotel name is required"),
  location: z.string().min(1, "Location is required"),
  district: z.string().min(1, "District is required"),
  address: z.string().min(1, "Address is required"),
  pincode: z.string().min(6, "Pincode must be at least 6 digits"),
  totalRooms: z.number().min(1, "Must have at least 1 room"),
  availableRooms: z.number().min(0, "Available rooms cannot be negative"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

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
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hotels = [], isLoading, error } = useQuery<Hotel[]>({
    queryKey: ["/api/admin/dashboard/hotels"],
  });

  // Form for hotel editing
  const form = useForm<z.infer<typeof hotelEditSchema>>({
    resolver: zodResolver(hotelEditSchema),
    defaultValues: {
      hotelName: "",
      location: "",
      district: "",
      address: "",
      pincode: "",
      totalRooms: 0,
      availableRooms: 0,
      startDate: "",
      endDate: "",
    },
  });

  // Mutation for updating hotel
  const updateHotelMutation = useMutation({
    mutationFn: async (data: { id: string; updates: z.infer<typeof hotelEditSchema> }) => {
      return await apiRequest(`/api/admin/hotels/${data.id}`, "PUT", data.updates);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/hotels"] });
      setIsEditModalOpen(false);
      setEditingHotel(null);
      form.reset();
      toast({
        title: "Hotel Updated",
        description: `Hotel has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update hotel",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    form.reset({
      hotelName: hotel.hotelName,
      location: hotel.location,
      district: hotel.district,
      address: hotel.address,
      pincode: hotel.pincode,
      totalRooms: hotel.totalRooms,
      availableRooms: hotel.availableRooms,
      startDate: new Date(hotel.startDate).toISOString().split('T')[0],
      endDate: new Date(hotel.endDate).toISOString().split('T')[0],
    });
    setIsEditModalOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: z.infer<typeof hotelEditSchema>) => {
    if (!editingHotel) return;
    updateHotelMutation.mutate({ id: editingHotel.id, updates: data });
  };

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
        dateRange: { from: hotel.startDate, to: hotel.endDate }
      };
    }

    const group = hotelGroups[hotel.hotelId];
    group.instances.push(hotel);
    group.totalRooms += hotel.totalRooms;
    group.availableRooms += hotel.availableRooms;
    group.occupiedRooms += (hotel.totalRooms - hotel.availableRooms);
    

    
    // Update date range
    if (new Date(hotel.startDate) < new Date(group.dateRange.from)) {
      group.dateRange.from = hotel.startDate;
    }
    if (new Date(hotel.endDate) > new Date(group.dateRange.to)) {
      group.dateRange.to = hotel.endDate;
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
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hotel.instances.map((instance) => (
                            <Button
                              key={instance.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditHotel(instance)}
                              data-testid={`button-edit-${instance.id}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          ))}
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

      {/* Edit Hotel Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit Hotel Details
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hotelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-hotel-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-hotel-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-hotel-district" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="totalRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-hotel-total-rooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="availableRooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Rooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-hotel-available-rooms"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-hotel-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-hotel-pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-hotel-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-hotel-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {editingHotel && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Hotel ID:</strong> {editingHotel.hotelId} • 
                    <strong> Instance:</strong> {editingHotel.instanceCode}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Hotel ID cannot be changed. Changes will only affect this instance.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateHotelMutation.isPending}
                  data-testid="button-save-hotel"
                >
                  {updateHotelMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}