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
      mobile: ""
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
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
      if (error.message.includes("409")) {
        setIsExistingCustomer(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      }
    }
  });

  const onSubmit = (data: InsertCustomer) => {
    if (isExistingCustomer) {
      navigate(`/dashboard/${data.mobile}`);
    } else {
      signupMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="/logo.png" 
            alt="Kitcho Family Logo" 
            className="h-24 mx-auto mb-6"
          />
          <CardTitle className="text-2xl">Welcome to Kitcho Family</CardTitle>
          <CardDescription>
            Join our family and start earning rewards on every visit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Button 
                type="submit" 
                className="w-full"
                disabled={signupMutation.isPending}
              >
                {isExistingCustomer ? "View Dashboard" : "Join Kitcho Family"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}