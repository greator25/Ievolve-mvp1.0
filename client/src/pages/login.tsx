import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginAdmin, requestOTP, verifyOTP } from "@/lib/auth";
import { Calendar, Bell, User } from "lucide-react";

export default function Login() {
  const [adminForm, setAdminForm] = useState({ email: "", password: "", remember: false });
  const [coachForm, setCoachForm] = useState({ mobileNumber: "", otp: "" });
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const adminLoginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      loginAdmin(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Success", description: "Logged in successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Login failed",
        variant: "destructive" 
      });
    },
  });

  const requestOTPMutation = useMutation({
    mutationFn: (mobileNumber: string) => requestOTP(mobileNumber),
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: "Success", description: "OTP sent to your mobile number" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send OTP",
        variant: "destructive" 
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: ({ mobileNumber, otp }: { mobileNumber: string; otp: string }) => 
      verifyOTP(mobileNumber, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Success", description: "Logged in successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Invalid OTP",
        variant: "destructive" 
      });
    },
  });

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminLoginMutation.mutate(adminForm);
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    requestOTPMutation.mutate(coachForm.mobileNumber);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOTPMutation.mutate(coachForm);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Ievolve Events</CardTitle>
            <CardDescription className="text-gray-500">CM Trophy 2025 Management</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" data-testid="tab-admin">Admin Login</TabsTrigger>
              <TabsTrigger value="coach" data-testid="tab-coach">Coach Login</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-6">
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@ievolve.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    required
                    data-testid="input-admin-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    required
                    data-testid="input-admin-password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={adminForm.remember}
                      onCheckedChange={(checked) => 
                        setAdminForm({ ...adminForm, remember: checked as boolean })
                      }
                      data-testid="checkbox-remember"
                    />
                    <Label htmlFor="remember" className="text-sm">Remember me</Label>
                  </div>
                  <Button variant="link" className="text-sm text-primary p-0 h-auto">
                    Forgot password?
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={adminLoginMutation.isPending}
                  data-testid="button-admin-login"
                >
                  {adminLoginMutation.isPending ? "Signing in..." : "Sign In as Admin"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="coach" className="space-y-4 mt-6">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        +91
                      </span>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="91234 56780"
                        className="rounded-l-none"
                        value={coachForm.mobileNumber}
                        onChange={(e) => setCoachForm({ ...coachForm, mobileNumber: e.target.value })}
                        required
                        data-testid="input-coach-mobile"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={requestOTPMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    {requestOTPMutation.isPending ? "Sending..." : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={coachForm.otp}
                      onChange={(e) => setCoachForm({ ...coachForm, otp: e.target.value })}
                      required
                      maxLength={6}
                      data-testid="input-otp"
                    />
                    <p className="text-sm text-gray-500">
                      OTP sent to +91 {coachForm.mobileNumber}
                    </p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-success-600 hover:bg-success-700" 
                    disabled={verifyOTPMutation.isPending}
                    data-testid="button-verify-otp"
                  >
                    {verifyOTPMutation.isPending ? "Verifying..." : "Verify & Login"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full text-primary"
                    onClick={() => {
                      setOtpSent(false);
                      setCoachForm({ ...coachForm, otp: "" });
                    }}
                    data-testid="button-back-to-mobile"
                  >
                    Change Mobile Number
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
