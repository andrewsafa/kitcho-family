import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Star, Award, Trophy } from "lucide-react";
import { Customer, LOYALTY_LEVELS } from "@shared/schema";

const LEVEL_ICONS = {
  Bronze: Award,
  Silver: Star,
  Gold: Crown,
  Diamond: Trophy  // Changed from Platinum to Diamond to match schema
};

export default function PartnerVerify() {
  const [mobile, setMobile] = useState("");
  const [searchPerformed, setSearchPerformed] = useState(false);

  const { data: customer, isLoading, error } = useQuery<Customer>({
    queryKey: [`/api/partner/verify/${mobile}`],
    enabled: searchPerformed && !!mobile,
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPerformed(true);
  };

  const currentLevel = customer?.level as keyof typeof LOYALTY_LEVELS | undefined;
  const Icon = currentLevel ? LEVEL_ICONS[currentLevel] || Award : Award;  // Added fallback

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-lg mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <img 
              src="/logo.png" 
              alt="Kitcho Family Logo" 
              className="h-16 mx-auto mb-2"
            />
            <CardTitle>Kitcho Family Partner Verification</CardTitle>
            <CardDescription>
              Verify customer loyalty level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Customer Mobile Number</Label>
                <div className="flex gap-2">
                  <Input 
                    id="mobile" 
                    value={mobile} 
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+1234567890"
                    required
                  />
                  <Button type="submit" disabled={isLoading}>
                    Verify
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {searchPerformed && (
          <>
            {isLoading && (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2">Verifying...</p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="p-6 text-center text-red-500">
                  Customer not found
                </CardContent>
              </Card>
            )}

            {customer && (
              <Card className="bg-white shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">Customer Found</h2>
                      <p className="text-muted-foreground">{customer.mobile}</p>
                    </div>
                    {Icon && <Icon className="h-12 w-12 text-primary" />}
                  </div>

                  {customer.verificationCode && (
                    <div className="mb-4 p-3 border border-primary rounded-md bg-primary/5">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Verification Code</p>
                        <p className="text-2xl font-bold tracking-widest text-primary">
                          {customer.verificationCode}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ask customer to show this code on their app
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Loyalty Level:</span>
                      <span className="text-lg font-bold text-primary">{customer.level}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Points Balance:</span>
                      <span className="text-lg">{customer.points.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}