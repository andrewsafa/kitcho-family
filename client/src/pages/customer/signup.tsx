import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCustomerSchema, type InsertCustomer } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export default function CustomerSignup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      password: ""
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create account");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to Kitcho Family!",
        description: "Your account has been created successfully."
      });
      navigate(`/dashboard/${data.mobile}`);
    },
    onError: (error) => {
      if (error.message.includes("already exists")) {
        setIsExistingCustomer(true);
        toast({
          title: "Account Exists",
          description: "Please log in with your existing account",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      }
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { mobile: string, password: string }) => {
      const res = await apiRequest("POST", "/api/customer/login", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome back!",
        description: "Successfully logged in"
      });
      navigate(`/dashboard/${data.mobile}`);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message
      });
    }
  });

  const onSubmit = (data: InsertCustomer) => {
    if (isExistingCustomer) {
      loginMutation.mutate({ 
        mobile: data.mobile,
        password: data.password 
      });
    } else {
      signupMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Kitcho Family</CardTitle>
          <CardDescription>
            {isExistingCustomer 
              ? "Welcome back! Please log in to your account"
              : "Join our family and start earning rewards on every visit"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {!isExistingCustomer && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isExistingCustomer ? "Enter your password" : "Create a password"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={signupMutation.isPending || loginMutation.isPending}
              >
                {isExistingCustomer ? 
                  (loginMutation.isPending ? "Logging in..." : "Login to Kitcho Family") : 
                  (signupMutation.isPending ? "Joining..." : "Join Kitcho Family")
                }
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsExistingCustomer(!isExistingCustomer);
                  form.reset();
                }}
              >
                {isExistingCustomer 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Log in"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}