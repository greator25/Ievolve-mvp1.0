import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Hotel } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export default function HotelCards() {
  const { data: hotels = [], isLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/hotels"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/hotels", {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }
      return await response.json();
    },
  });

  const getOccupancyStatus = (occupiedRooms: number, totalRooms: number) => {
    const percentage = (occupiedRooms / totalRooms) * 100;
    if (percentage >= 90) return { label: "High Occupancy", variant: "warning" as const, color: "warning-500" };
    if (percentage >= 70) return { label: "Active", variant: "default" as const, color: "primary-600" };
    return { label: "Available", variant: "success" as const, color: "success-500" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hotel Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-2 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group hotels by hotelId and show the most recent instance
  const hotelGroups = hotels.reduce((acc: Record<string, Hotel>, hotel: Hotel) => {
    if (!acc[hotel.hotelId] || new Date(hotel.startDate) > new Date(acc[hotel.hotelId].startDate)) {
      acc[hotel.hotelId] = hotel;
    }
    return acc;
  }, {});

  const displayHotels = Object.values(hotelGroups);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hotel Inventory Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayHotels.map((hotel) => {
            const occupancyPercentage = Math.round((hotel.occupiedRooms / hotel.totalRooms) * 100);
            const status = getOccupancyStatus(hotel.occupiedRooms, hotel.totalRooms);
            
            return (
              <div 
                key={hotel.id} 
                className="bg-gray-50 rounded-lg p-4"
                data-testid={`hotel-card-${hotel.hotelId}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900" data-testid={`hotel-name-${hotel.hotelId}`}>
                      {hotel.hotelName}
                    </h4>
                    <p className="text-sm text-gray-500" data-testid={`hotel-location-${hotel.hotelId}`}>
                      {hotel.hotelId} • {hotel.location}, {hotel.district}
                    </p>
                    <div className="mt-2">
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500">Occupancy:</span>
                        <span className="ml-2 font-medium text-gray-900" data-testid={`hotel-occupancy-${hotel.hotelId}`}>
                          {hotel.occupiedRooms}/{hotel.totalRooms} rooms
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`bg-${status.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${occupancyPercentage}%` }}
                          data-testid={`hotel-progress-${hotel.hotelId}`}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={status.variant} 
                    className={`
                      ${status.variant === 'warning' ? 'bg-warning-100 text-warning-800' : ''}
                      ${status.variant === 'success' ? 'bg-success-100 text-success-800' : ''}
                    `}
                    data-testid={`hotel-status-${hotel.hotelId}`}
                  >
                    {status.label}
                  </Badge>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-gray-500" data-testid={`hotel-available-${hotel.hotelId}`}>
                    Available: {hotel.availableRooms}
                  </span>
                  <span className="text-gray-500" data-testid={`hotel-dates-${hotel.hotelId}`}>
                    {new Date(hotel.startDate).toLocaleDateString()} - {new Date(hotel.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {displayHotels.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No hotels found. Upload hotel inventory data to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
