import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, Briefcase } from "lucide-react";

export default function PartnerVerify() {
  const [, setLocation] = useLocation();

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
            <CardTitle>Kitcho Family Partner Portal</CardTitle>
            <CardDescription>
              Welcome to the Kitcho Family Partner Portal. Please log in to access 
              the verification system and manage customer loyalty information.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <p className="mb-6 text-muted-foreground">
              As a verified partner, you can check customer loyalty levels and verify
              customer identities using their unique verification codes.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => setLocation("/partner/login")} 
              className="w-full"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Partner Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}