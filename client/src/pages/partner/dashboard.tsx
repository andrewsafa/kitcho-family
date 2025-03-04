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
import { Search, LogOut, User, CreditCard, Crown, Star, Award, Trophy } from "lucide-react";

// Define the level icons mapping
const LEVEL_ICONS = {
  Bronze: Award,
  Silver: Star,
  Gold: Crown,
  Diamond: Trophy
};

export default function PartnerDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mobileNumber, setMobileNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

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
      setVerificationSuccess(false); // Reset verification status
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
    setVerificationSuccess(true);

    toast({
      title: "Verification successful",
      description: `Customer verified successfully`
    });
  };

  // Handle closing verification dialog
  const handleCloseVerification = () => {
    setShowVerificationDialog(false);
    setVerificationCode("");
    setVerificationSuccess(false);
    setCustomer(null);
    setMobileNumber("");
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

  // Get the appropriate icon component for the customer's level
  const getLevelIcon = (level: string) => {
    const Icon = LEVEL_ICONS[level as keyof typeof LEVEL_ICONS] || Award;
    return <Icon className="h-12 w-12 text-primary" />;
  };

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
                Enter a customer's mobile number and verify their identity using their unique verification code
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

          {customer && !verificationSuccess && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <p className="text-center text-sm mb-1">Please ask the customer to provide their verification code</p>
                <div>
                  <label className="block text-sm font-medium mb-1">Verification Code</label>
                  <Input
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {customer && verificationSuccess && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Verification Successful</h3>
                    <p className="text-muted-foreground">Customer identity verified</p>
                  </div>
                  {getLevelIcon(customer.level)}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center p-2 bg-primary/5 rounded-md">
                    <span className="font-semibold">Loyalty Level:</span>
                    <span className="text-lg font-bold text-primary">{customer.level}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!verificationSuccess ? (
              <>
                <Button variant="outline" onClick={handleCloseVerification}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmVerification}>
                  Verify
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseVerification}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}