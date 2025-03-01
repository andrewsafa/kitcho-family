import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LOYALTY_LEVELS, type LoyaltyLevel, type LevelBenefit } from "@shared/schema";
import { Award, Star, Crown, Trophy } from "lucide-react";

const LEVEL_ICONS = {
  Bronze: Award,
  Silver: Star,
  Gold: Crown,
  Diamond: Trophy
};

interface LevelBenefitsProps {
  currentLevel: LoyaltyLevel;
}

export function LevelBenefits({ currentLevel }: LevelBenefitsProps) {
  const Icon = LEVEL_ICONS[currentLevel];

  const { data: benefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: [`/api/benefits/${currentLevel}`],
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-primary" />
          <CardTitle>{currentLevel} Benefits</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {benefits.map((benefit) => (
            <li key={benefit.id} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{benefit.benefit}</span>
            </li>
          ))}
          {benefits.length === 0 && (
            <li className="text-muted-foreground">No active benefits</li>
          )}
        </ul>

        {currentLevel !== "Diamond" && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-2">Next Level:</h4>
            <p className="text-sm text-muted-foreground">
              Reach {LOYALTY_LEVELS[currentLevel].max + 1} points to unlock more benefits
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}