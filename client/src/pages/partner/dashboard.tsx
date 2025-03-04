import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LogOut, User, CreditCard } from "lucide-react";

export default function PartnerDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mobileNumber, setMobileNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  // Get partner profile information
  const { data: partner, isLoading: isLoadingPartner } = useQuery({
    queryKey: ["/api/partner/me"],
    retry: false
  });

  // Handle authentication errors
  useEffect(() => {
    if (!isLoadingPartner && !partner) {
      toast({
        title: "Authentication Error",
        description: "Please log in to access the partner dashboard",
        variant: "destructive"
      });
      setLocation("/partner/login");
    }
  }, [isLoadingPartner, partner, toast, setLocation]);

  // Log out mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partner/logout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me"] });
      toast({ title: "Logged out successfully" });
      setLocation("/partner/login");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error logging out",
        description: error instanceof Error ? error.message : "An error occurred"
      });
    }
  });

  // Verify customer mutation
  const verifyCustomerMutation = useMutation({
    mutationFn: async (mobile: string) => {
      const res = await apiRequest("GET", `/api/partner/verify/${mobile}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCustomer(data);
      setShowVerificationDialog(true);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Customer not found"
      });
    }
  });

  // Handle customer verification
  const handleVerifyCustomer = () => {
    if (!mobileNumber) {
      toast({
        variant: "destructive",
        title: "Mobile number required",
        description: "Please enter a mobile number to verify"
      });
      return;
    }

    verifyCustomerMutation.mutate(mobileNumber);
  };

  // Handle verification code confirmation
  const handleConfirmVerification = () => {
    if (!customer || !verificationCode) {
      toast({
        variant: "destructive",
        title: "Verification code required",
        description: "Please enter the verification code"
      });
      return;
    }

    if (verificationCode !== customer.verificationCode) {
      toast({
        variant: "destructive",
        title: "Invalid verification code",
        description: "The verification code does not match"
      });
      return;
    }

    // Verification successful
    toast({
      title: "Verification successful",
      description: `Customer ${customer.name} verified successfully`
    });

    // Close dialog and reset form
    setShowVerificationDialog(false);
    setVerificationCode("");
    setMobileNumber("");
    setCustomer(null);

    // Navigate to customer dashboard
    setLocation(`/dashboard/${customer.mobile}`);
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logoutMutation.mutate();
    }
  };

  if (isLoadingPartner) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Partner Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {partner?.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Log Out
        </Button>
      </div>

      <Tabs defaultValue="verify">
        <TabsList className="mb-4">
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Verify Customer
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Reward Points
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Customer Verification</CardTitle>
              <CardDescription>
                Enter a customer's mobile number to verify their identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="max-w-md"
                />
                <Button onClick={handleVerifyCustomer}>
                  <Search className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Reward Points</CardTitle>
              <CardDescription>
                Coming soon: Reward points feature for partners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-4">
                This feature is under development and will be available soon. It will allow
                partners to award points to customers for purchases and activities.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Customer Identity</DialogTitle>
            <DialogDescription>
              Please ask the customer for their verification code.
            </DialogDescription>
          </DialogHeader>

          {customer && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Name:</div>
                  <div>{customer.name}</div>
                  <div className="text-sm font-medium">Mobile:</div>
                  <div>{customer.mobile}</div>
                  <div className="text-sm font-medium">Loyalty Level:</div>
                  <div className="font-semibold">{customer.level}</div>
                  <div className="text-sm font-medium">Points:</div>
                  <div className="font-semibold">{customer.points.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Verification Code</label>
                <Input
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerificationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmVerification}>
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}