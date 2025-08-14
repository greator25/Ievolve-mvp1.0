import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Edit, LogIn, LogOut, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import type { Participant, ParticipantFilters } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ParticipantTableProps {
  isAdmin?: boolean;
  coachId?: string;
}

export default function ParticipantTable({ isAdmin = false, coachId }: ParticipantTableProps) {
  const [filters, setFilters] = useState<ParticipantFilters>({
    search: "",
    discipline: "",
    role: "",
    checkinStatus: "",
    hotelId: "",
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading } = useQuery({
    queryKey: [
      isAdmin ? "/api/admin/dashboard/participants" : "/api/coach/dashboard",
      filters
    ],
    queryFn: async () => {
      const endpoint = isAdmin ? "/api/admin/dashboard/participants" : "/api/coach/dashboard";
      const params = new URLSearchParams();
      
      if (isAdmin) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${endpoint}?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }

      const data = await response.json();
      return isAdmin ? data : data.players || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return <Badge className="bg-success-100 text-success-800" data-testid={`status-checked-in`}>Checked In</Badge>;
      case "checked_out":
        return <Badge variant="secondary" data-testid={`status-checked-out`}>Checked Out</Badge>;
      default:
        return <Badge className="bg-warning-100 text-warning-800" data-testid={`status-pending`}>Pending</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Admin check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch("/api/admin/checkin", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [participantId] }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Check-in failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/participants"] });
      toast({
        title: "Success",
        description: `Participant checked in successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Check-in failed",
        variant: "destructive",
      });
    },
  });

  // Admin check-out mutation
  const checkoutMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const response = await fetch("/api/admin/checkout", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [participantId] }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Check-out failed');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/participants"] });
      toast({
        title: "Success",
        description: `Participant checked out successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Check-out failed",
        variant: "destructive",
      });
    },
  });

  const handleAdminCheckin = (participantId: string) => {
    checkinMutation.mutate(participantId);
  };

  const handleAdminCheckout = (participantId: string) => {
    checkoutMutation.mutate(participantId);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "coach":
        return "bg-warning-100";
      case "official":
        return "bg-primary-100";
      case "player":
        return "bg-success-100";
      default:
        return "bg-gray-100";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>
              {isAdmin ? "Participant Management" : "My Team Players"}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin 
                ? "Manage bookings, check-ins, and accommodations"
                : `${participants.length} players under your supervision`
              }
            </p>
          </div>
          {isAdmin && (
            <Button data-testid="button-add-participant">
              Add Participant
            </Button>
          )}
        </div>

        {/* Search and Filters - Admin only */}
        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search participants..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                data-testid="input-search-participants"
              />
            </div>
            <Select
              value={filters.discipline || "all"}
              onValueChange={(value) => setFilters({ ...filters, discipline: value === "all" ? "" : value, page: 1 })}
            >
              <SelectTrigger data-testid="select-discipline">
                <SelectValue placeholder="All Disciplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                <SelectItem value="Football">Football</SelectItem>
                <SelectItem value="Athletics">Athletics</SelectItem>
                <SelectItem value="Swimming">Swimming</SelectItem>
                <SelectItem value="Basketball">Basketball</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.checkinStatus || "all"}
              onValueChange={(value) => setFilters({ ...filters, checkinStatus: value === "all" ? "" : value, page: 1 })}
            >
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.role || "all"}
              onValueChange={(value) => setFilters({ ...filters, role: value === "all" ? "" : value, page: 1 })}
            >
              <SelectTrigger data-testid="select-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="official">Official</SelectItem>
                <SelectItem value="player">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Participant</TableHead>
                <TableHead>Role/Team</TableHead>
                <TableHead>Hotel/Booking</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant: Participant) => (
                <TableRow key={participant.id} className="hover:bg-gray-50" data-testid={`participant-row-${participant.participantId}`}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={getRoleColor(participant.role)}>
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900" data-testid={`participant-name-${participant.participantId}`}>
                          {participant.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.participantId}
                          {participant.mobileNumber && ` • ${participant.mobileNumber}`}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 capitalize">
                      {participant.role}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.discipline}
                      {participant.district && ` • ${participant.district}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{participant.hotelName}</div>
                    <div className="text-sm text-gray-500 font-mono">
                      {participant.bookingReference}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {new Date(participant.bookingStartDate).toLocaleDateString()} - {new Date(participant.bookingEndDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.ceil((new Date(participant.bookingEndDate).getTime() - new Date(participant.bookingStartDate).getTime()) / (1000 * 3600 * 24))} days
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(participant.checkinStatus)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {isAdmin ? (
                        <>
                          <Button size="sm" variant="ghost" data-testid={`button-edit-${participant.participantId}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {participant.checkinStatus === 'pending' ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-success-600 hover:bg-success-50"
                              onClick={() => handleAdminCheckin(participant.participantId)}
                              disabled={checkinMutation.isPending}
                              data-testid={`button-checkin-${participant.participantId}`}
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                          ) : participant.checkinStatus === 'checked_in' ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-error-600 hover:bg-error-50"
                              onClick={() => handleAdminCheckout(participant.participantId)}
                              disabled={checkoutMutation.isPending}
                              data-testid={`button-checkout-${participant.participantId}`}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-gray-400"
                              disabled
                              data-testid={`button-completed-${participant.participantId}`}
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" data-testid={`button-more-${participant.participantId}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {participant.checkinStatus === 'pending' ? (
                            <Button 
                              size="sm" 
                              className="bg-primary-600 text-white hover:bg-primary-700"
                              data-testid={`button-checkin-${participant.participantId}`}
                            >
                              Check In
                            </Button>
                          ) : participant.checkinStatus === 'checked_in' ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-error-600 text-error-600 hover:bg-error-50"
                              data-testid={`button-checkout-${participant.participantId}`}
                            >
                              Check Out
                            </Button>
                          ) : (
                            <Badge variant="secondary">Completed</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Admin only */}
        {isAdmin && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                variant="outline"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                data-testid="button-prev-mobile"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                data-testid="button-next-mobile"
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to{' '}
                  <span className="font-medium">{Math.min(filters.limit || 10, participants.length)}</span> of{' '}
                  <span className="font-medium">{participants.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                    data-testid="button-prev-desktop"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary-50 border-primary-500 text-primary-600"
                    data-testid="button-current-page"
                  >
                    {filters.page || 1}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                    data-testid="button-next-desktop"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
