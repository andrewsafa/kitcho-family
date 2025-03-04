import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type Customer, LOYALTY_LEVELS } from "@shared/schema";
import { Crown, Star, Award, Trophy } from "lucide-react";

const LEVEL_ICONS = {
  Bronze: Award,
  Silver: Star,
  Gold: Crown,
  Diamond: Trophy  // Changed from Platinum to Diamond to match schema
};

interface LoyaltyCardProps {
  customer: Customer;
}

export function LoyaltyCard({ customer }: LoyaltyCardProps) {
  const currentLevel = customer.level as keyof typeof LOYALTY_LEVELS;
  const { min, max } = LOYALTY_LEVELS[currentLevel];
  const Icon = LEVEL_ICONS[currentLevel] || Award;  // Added fallback

  const progress = max === Infinity 
    ? 100 
    : ((customer.points - min) / (max - min)) * 100;

  const nextLevel = Object.entries(LOYALTY_LEVELS).find(
    ([, range]) => range.min > customer.points
  )?.[0];

  return (
    <Card className="bg-white shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{customer.name}</h2>
            <p className="text-muted-foreground">{customer.mobile}</p>
          </div>
          <Icon className="h-12 w-12 text-primary" />
        </div>

        {customer.verificationCode && (
          <div className="mb-4 p-3 border border-primary/20 rounded-md bg-primary/5">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Verification Code:</span>
              <span className="text-xl font-bold tracking-wider text-primary">
                {customer.verificationCode}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Show this code to partners when claiming rewards or discounts
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">{customer.points} Points</span>
              <span className="text-primary font-medium">{currentLevel}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {nextLevel && (
            <p className="text-sm text-muted-foreground">
              Earn {LOYALTY_LEVELS[nextLevel as keyof typeof LOYALTY_LEVELS].min - customer.points} more points to reach {nextLevel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}