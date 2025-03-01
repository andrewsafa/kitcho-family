import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LOYALTY_LEVELS, type LoyaltyLevel } from "@shared/schema";
import { Award, Star, Crown, Trophy } from "lucide-react";

const LEVEL_BENEFITS = {
  Bronze: [
    "Earn 1 point per $1 spent",
    "Birthday reward",
    "Member-only newsletters"
  ],
  Silver: [
    "Earn 1.25 points per $1 spent",
    "Free shipping on orders over $50",
    "Early access to sales",
    "All Bronze benefits"
  ],
  Gold: [
    "Earn 1.5 points per $1 spent",
    "Free shipping on all orders",
    "Exclusive event invitations",
    "Priority customer service",
    "All Silver benefits"
  ],
  Platinum: [
    "Earn 2 points per $1 spent",
    "Personal shopping assistant",
    "VIP event access",
    "Custom rewards",
    "All Gold benefits"
  ]
};

const LEVEL_ICONS = {
  Bronze: Award,
  Silver: Star,
  Gold: Crown,
  Platinum: Trophy
};

interface LevelBenefitsProps {
  currentLevel: LoyaltyLevel;
}

export function LevelBenefits({ currentLevel }: LevelBenefitsProps) {
  const Icon = LEVEL_ICONS[currentLevel];

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
          {LEVEL_BENEFITS[currentLevel].map((benefit, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {currentLevel !== "Platinum" && (
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