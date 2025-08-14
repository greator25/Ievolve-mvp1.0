import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { 
  Calendar, Bell, User, Upload, Download, Plus, Menu,
  Building, UserCheck, Users as UsersIcon
} from "lucide-react";
import StatsCards from "@/components/stats-cards";
import UploadModal from "@/components/upload-modal";
import ParticipantTable from "@/components/participant-table";
import HotelCards from "@/components/hotel-cards";
import type { DashboardStats } from "@/lib/types";

export default function AdminDashboard() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"hotel_inventory" | "coaches_officials" | "players" | "">("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const user = authData?.user || null;

  // Get dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch("/api/admin/dashboard/stats", {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return await response.json();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Success", description: "Logged out successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Logout failed",
        variant: "destructive",
      });
    },
  });

  // Export participants mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export/participants", {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `participants-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Data exported successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Export failed",
        variant: "destructive",
      });
    },
  });

  const handleUploadClick = (type: "hotel_inventory" | "coaches_officials" | "players") => {
    setUploadType(type);
    setUploadModalOpen(true);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (statsLoading || !stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="bg-white shadow-sm border-b border-gray-200 h-16"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-lg shadow h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-900">Ievolve Events</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <a href="#dashboard" className="bg-primary-100 text-primary-700 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-dashboard">
                    Dashboard
                  </a>
                  <a href="#participants" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-participants">
                    Participants
                  </a>
                  <a href="#hotels" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-hotels">
                    Hotels
                  </a>
                  <a href="#reports" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium" data-testid="nav-reports">
                    Reports
                  </a>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6">
                <Button variant="ghost" size="sm" className="p-1 rounded-full text-gray-400 hover:text-gray-500" data-testid="button-notifications">
                  <Bell className="h-6 w-6" />
                </Button>
                <div className="ml-3 relative">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700" data-testid="text-admin-name">
                      {user?.name || "Admin User"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="h-8 w-8 bg-primary rounded-full flex items-center justify-center"
                      data-testid="button-user-menu"
                    >
                      <User className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:hidden">
              <Button variant="ghost" size="sm" className="bg-gray-100 inline-flex items-center justify-center p-2 rounded-md text-gray-400" data-testid="button-mobile-menu">
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate" data-testid="header-title">
                CM Trophy 2025 - Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-500" data-testid="header-subtitle">
                Manage accommodations, check-ins, and event logistics
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "Exporting..." : "Export Data"}
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                data-testid="button-upload-data"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Data
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8">
          <StatsCards stats={stats} />
        </div>

        {/* Data Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Hotel Inventory Upload */}
              <div 
                className="border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
                onClick={() => handleUploadClick("hotel_inventory")}
                data-testid="upload-area-hotel-inventory"
              >
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <Building className="h-12 w-12" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Hotel Inventory Sheet</p>
                  <p className="text-gray-500 mt-1">Upload hotel room availability data</p>
                </div>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" data-testid="button-upload-hotel-inventory">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PSV
                  </Button>
                </div>
              </div>

              {/* Coach & Official Data Upload */}
              <div 
                className="border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
                onClick={() => handleUploadClick("coaches_officials")}
                data-testid="upload-area-coaches-officials"
              >
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <UserCheck className="h-12 w-12" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Coach & Official Data</p>
                  <p className="text-gray-500 mt-1">Upload coach and official information</p>
                </div>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" data-testid="button-upload-coaches-officials">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PSV
                  </Button>
                </div>
              </div>

              {/* Player Data Upload */}
              <div 
                className="border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
                onClick={() => handleUploadClick("players")}
                data-testid="upload-area-players"
              >
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <UsersIcon className="h-12 w-12" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Player Data Sheet</p>
                  <p className="text-gray-500 mt-1">Upload player registration data</p>
                </div>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" data-testid="button-upload-players">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PSV
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Management */}
        <div className="mb-8">
          <ParticipantTable isAdmin={true} />
        </div>

        {/* Hotel Management Overview */}
        <HotelCards />
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
