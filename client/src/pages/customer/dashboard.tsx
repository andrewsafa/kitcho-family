import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { type Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LoyaltyCard from "@/components/loyalty-card";
import PointsHistory from "@/components/points-history";
import LevelBenefits from "@/components/level-benefits";

export default function CustomerDashboard() {
  const { mobile } = useParams();

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: [`/api/customers/mobile/${mobile}`],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!customer) {
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
        <LoyaltyCard customer={customer} />
        <div className="grid md:grid-cols-2 gap-6">
          <PointsHistory customerId={customer.id} />
          <LevelBenefits currentLevel={customer.level} />
        </div>
      </div>
    </div>
  );
}
