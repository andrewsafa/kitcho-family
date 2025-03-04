import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type Customer, type LoyaltyLevel } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoyaltyCard } from "@/components/loyalty-card";
import { PointsHistory } from "@/components/points-history";
import { LevelBenefits } from "@/components/level-benefits";
import { Announcements } from "@/components/announcements";
import { useToast } from "@/hooks/use-toast";

export default function CustomerDashboard() {
  const { mobile } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Login mutation to handle verification code regeneration
  const loginMutation = useMutation({
    mutationFn: async (mobile: string) => {
      const res = await apiRequest("POST", "/api/customers/login", { mobile });
      return res.json();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Unable to verify your identity. Please try again."
      });
      setLocation("/");
    }
  });

  // Use the original query but with enabled set to false initially
  const { data: customer, isLoading, refetch } = useQuery<Customer>({
    queryKey: [`/api/customers/mobile/${mobile}`],
    enabled: false, // We'll handle this manually after login
  });

  // On component mount, call the login endpoint to regenerate verification code
  useEffect(() => {
    if (mobile) {
      loginMutation.mutate(mobile);
    }
  }, [mobile]);

  // When login is successful, we can use the data directly from the mutation
  const isLoadingCustomer = isLoading || loginMutation.isPending;
  const customerData = loginMutation.data || customer;

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Customer not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Announcements customerLevel={customerData.level as LoyaltyLevel} />
        <LoyaltyCard customer={customerData} />
        <div className="grid md:grid-cols-2 gap-6">
          <PointsHistory customerId={customerData.id} />
          <LevelBenefits currentLevel={customerData.level as LoyaltyLevel} />
        </div>
      </div>
    </div>
  );
}