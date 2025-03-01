import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type InsertPointTransaction, type LevelBenefit, type SpecialEvent, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialEventSchema } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("Bronze");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: benefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: [`/api/benefits/${selectedLevel}`],
  });

  const { data: specialEvents = [] } = useQuery<SpecialEvent[]>({
    queryKey: ["/api/events"],
  });

  // Points form
  const formSchema = z.object({
    mobile: z.string(),
    points: z.coerce.number(),
    description: z.string().min(1, "Description is required"),
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: "",
      points: 0,
      description: ""
    }
  });

  // Benefits form
  const benefitForm = useForm({
    resolver: zodResolver(insertLevelBenefitSchema),
    defaultValues: {
      level: "Bronze",
      benefit: ""
    }
  });

  // Special Events form
  const eventForm = useForm({
    resolver: zodResolver(insertSpecialEventSchema),
    defaultValues: {
      name: "",
      description: "",
      multiplier: 2,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  const addPointsMutation = useMutation({
    mutationFn: async (data: InsertPointTransaction) => {
      const res = await apiRequest("POST", "/api/points", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Points added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      form.reset();
      setSelectedCustomer(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const addBenefitMutation = useMutation({
    mutationFn: async (data: { level: string; benefit: string }) => {
      const res = await apiRequest("POST", "/api/benefits", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Benefit added successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/benefits/${selectedLevel}`] });
      benefitForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const addEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertSpecialEventSchema>) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Special event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      eventForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    }
  });

  const updateBenefitMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/benefits/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/benefits/${selectedLevel}`] });
    }
  });

  const handleSearch = async (mobile: string) => {
    const customer = customers.find(c => c.mobile === mobile);
    setSelectedCustomer(customer || null);
    if (!customer) {
      toast({
        variant: "destructive",
        title: "Customer not found"
      });
    }
  };

  const onSubmit = (data: FormData) => {
    if (!selectedCustomer) return;

    const transactionData: InsertPointTransaction = {
      customerId: selectedCustomer.id,
      points: data.points,
      description: data.description
    };

    addPointsMutation.mutate(transactionData);
  };

  const onBenefitSubmit = (data: { level: string; benefit: string }) => {
    // Ensure we're using the selected level from the dropdown
    const benefitData = {
      ...data,
      level: selectedLevel // Use the selected level from state
    };
    addBenefitMutation.mutate(benefitData);
  };

  const onEventSubmit = (data: z.infer<typeof insertSpecialEventSchema>) => {
    addEventMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Kitcho Family Logo" 
            className="h-24 mx-auto"
          />
          <h1 className="text-2xl font-bold mt-4">Admin Dashboard</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Points</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Customer Mobile</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="+1234567890" {...field} />
                            <Button 
                              type="button"
                              onClick={() => handleSearch(field.value)}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Points</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit"
                  disabled={!selectedCustomer || addPointsMutation.isPending}
                >
                  Add Points
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4">
                  <FormField
                    control={eventForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Summer Sale" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={eventForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Double points on all purchases" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4">
                    <FormField
                      control={eventForm.control}
                      name="multiplier"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Point Multiplier</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4">
                    <FormField
                      control={eventForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={eventForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={addEventMutation.isPending}
                  >
                    Create Event
                  </Button>
                </form>
              </Form>

              <div className="space-y-4">
                <h3 className="font-medium">Active Events</h3>
                {specialEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.name}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <p className="text-sm">
                        {format(new Date(event.startDate), "MMM d, yyyy")} - {format(new Date(event.endDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-sm font-medium text-primary">{event.multiplier}x Points</p>
                    </div>
                    <Switch
                      checked={event.active}
                      onCheckedChange={(checked) => 
                        updateEventMutation.mutate({ id: event.id, active: checked })
                      }
                    />
                  </div>
                ))}
                {specialEvents.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No special events</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Level Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Select 
                value={selectedLevel} 
                onValueChange={setSelectedLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Gold">Gold</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>

              <Form {...benefitForm}>
                <form onSubmit={benefitForm.handleSubmit(onBenefitSubmit)} className="space-y-4">
                  <FormField
                    control={benefitForm.control}
                    name="benefit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Benefit</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter benefit description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={benefitForm.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} value={selectedLevel} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit"
                    disabled={addBenefitMutation.isPending}
                  >
                    Add Benefit
                  </Button>
                </form>
              </Form>

              <div className="space-y-2">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="flex items-center justify-between py-2">
                    <span>{benefit.benefit}</span>
                    <Switch
                      checked={benefit.active}
                      onCheckedChange={(checked) => 
                        updateBenefitMutation.mutate({ id: benefit.id, active: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.mobile}</TableCell>
                    <TableCell>{customer.points}</TableCell>
                    <TableCell>{customer.level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}