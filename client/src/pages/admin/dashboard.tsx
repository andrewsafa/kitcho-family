import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type InsertPointTransaction, type LevelBenefit, type SpecialEvent, type SpecialOffer, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialEventSchema, insertSpecialOfferSchema } from "@shared/schema";
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
import { showNotification, notifyPointsAdded, notifySpecialEvent, notifySpecialOffer, requestNotificationPermission } from "@/lib/notifications";
import { Download, Upload, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";

interface BackupConfig {
  frequency: string;
  maxBackups: number;
  enabled: boolean;
  backupDir: string;
}

interface BackupHistory {
  timestamp: string;
  filename: string;
  size: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("Bronze");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBackupSettings, setShowBackupSettings] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.mobile.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { data: benefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: [`/api/benefits/${selectedLevel}`],
  });

  const { data: specialEvents = [] } = useQuery<SpecialEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: specialOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: [`/api/offers/${selectedLevel}`],
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

  // Special Offers form
  const offerForm = useForm({
    resolver: zodResolver(insertSpecialOfferSchema),
    defaultValues: {
      level: "Bronze",
      title: "",
      description: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  // Password change form
  const changePasswordForm = useForm({
    resolver: zodResolver(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
        confirmPassword: z.string()
      }).refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
      })
    ),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });


  const addPointsMutation = useMutation({
    mutationFn: async (data: InsertPointTransaction) => {
      const res = await apiRequest("POST", "/api/points", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Points added successfully" });
      notifyPointsAdded(data.points, data.totalPoints);
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
    onSuccess: (data) => {
      toast({ title: "Special event created successfully" });
      notifySpecialEvent(data.name, data.multiplier, new Date(data.endDate));
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

  const addOfferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertSpecialOfferSchema>) => {
      const res = await apiRequest("POST", "/api/offers", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Special offer created successfully" });
      notifySpecialOffer(data.title, new Date(data.validUntil));
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${selectedLevel}`] });
      offerForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/offers/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${selectedLevel}`] });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/admin/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated successfully"
      });
      changePasswordForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update password",
        description: error.message
      });
    }
  });

  const deletePointsMutation = useMutation({
    mutationFn: async (data: { customerId: number; points: number; description: string }) => {
      const res = await apiRequest("POST", "/api/points/delete", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Points deleted successfully" });
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

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await apiRequest("DELETE", `/api/customers/${customerId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Customer deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const { data: backupConfig } = useQuery<BackupConfig>({
    queryKey: ["/api/backup/config"],
  });

  const { data: backupHistory = [] } = useQuery<BackupHistory[]>({
    queryKey: ["/api/backup/history"],
  });

  const updateBackupConfigMutation = useMutation({
    mutationFn: async (config: Partial<BackupConfig>) => {
      const res = await apiRequest("POST", "/api/backup/config", config);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Backup settings updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/history"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update backup settings",
        description: error.message
      });
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backup/run");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Manual backup created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/backup/history"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create backup",
        description: error.message
      });
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

  const onOfferSubmit = (data: z.infer<typeof insertSpecialOfferSchema>) => {
    const offerData = {
      ...data,
      level: selectedLevel
    };
    addOfferMutation.mutate(offerData);
  };

  const onChangePasswordSubmit = (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  };

  const handleDeletePoints = (customer: Customer) => {
    const pointsToDelete = window.prompt("Enter number of points to delete:");
    if (!pointsToDelete) return;

    const numPoints = parseInt(pointsToDelete);
    if (isNaN(numPoints) || numPoints <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid points value",
        description: "Please enter a positive number"
      });
      return;
    }

    if (numPoints > customer.points) {
      toast({
        variant: "destructive",
        title: "Invalid points value",
        description: "Cannot delete more points than customer has"
      });
      return;
    }

    const reason = window.prompt("Enter reason for deleting points:");
    if (!reason) return;

    deletePointsMutation.mutate({
      customerId: customer.id,
      points: numPoints,
      description: reason
    });
  };

  const handleDeleteCustomer = (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch('/api/backup', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Backup failed');

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitcho-family-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Backup created successfully" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Backup failed",
        description: error.message
      });
    }
  };

  const handleRestore = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            const response = await apiRequest("POST", "/api/restore", data);

            if (!response.ok) throw new Error('Restore failed');

            toast({ title: "Data restored successfully" });
            // Refresh all data
            queryClient.invalidateQueries();
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Restore failed",
              description: error.message
            });
          }
        };
        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Restore failed",
        description: error.message
      });
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

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

          {/* Add Backup/Restore buttons */}
          <div className="flex justify-center gap-4 mt-4">
            <Button
              onClick={handleBackup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Backup Data
            </Button>
            <Button
              onClick={handleRestore}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restore Data
            </Button>
            <Button
              onClick={() => setShowBackupSettings(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Backup Settings
            </Button>
          </div>
        </div>

        <Dialog open={showBackupSettings} onOpenChange={setShowBackupSettings}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Backup Settings</DialogTitle>
              <DialogDescription>
                Configure automated backup schedule and retention.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={backupConfig?.enabled}
                  onCheckedChange={(checked) =>
                    updateBackupConfigMutation.mutate({ enabled: checked })
                  }
                />
                <label htmlFor="enabled">Enable Automated Backups</label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Backup Frequency</label>
                <Select
                  value={backupConfig?.frequency}
                  onValueChange={(value) =>
                    updateBackupConfigMutation.mutate({ frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0 0 * * *">Daily (Midnight)</SelectItem>
                    <SelectItem value="0 0 * * 0">Weekly (Sunday)</SelectItem>
                    <SelectItem value="0 0 1 * *">Monthly (1st)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Maximum Backups</label>
                <Input
                  type="number"
                  value={backupConfig?.maxBackups}
                  onChange={(e) =>
                    updateBackupConfigMutation.mutate({
                      maxBackups: parseInt(e.target.value)
                    })
                  }
                  min={1}
                  max={30}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Backup History</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {backupHistory.map((backup) => (
                    <div
                      key={backup.filename}
                      className="text-sm p-2 border rounded"
                    >
                      <p className="font-medium">{backup.filename}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(backup.timestamp), "PPp")}
                      </p>
                      <p className="text-muted-foreground">
                        Size: {(backup.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBackupSettings(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => runBackupMutation.mutate()}
                disabled={runBackupMutation.isPending}
              >
                Run Backup Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input placeholder="Enter mobile number" {...field} />
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
                          <Input placeholder="Enter event name" {...field} />
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
                          <Input placeholder="Enter event description" {...field} />
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
                <h3>Active Events</h3>
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
            <CardTitle>Special Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Form {...offerForm}>
                <form onSubmit={offerForm.handleSubmit(onOfferSubmit)} className="space-y-4">
                  <FormField
                    control={offerForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter offer title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter offer description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valid Until</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={offerForm.control}
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
                    disabled={addOfferMutation.isPending}
                  >
                    Create Offer
                  </Button>
                </form>
              </Form>

              <div className="space-y-4">
                <h3>Active Offers for {selectedLevel}</h3>
                {specialOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{offer.title}</h4>
                      <p className="text-sm text-muted-foreground">{offer.description}</p>
                      <p className="text-sm">
                        Valid until {format(new Date(offer.validUntil), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Switch
                      checked={offer.active}
                      onCheckedChange={(checked) =>
                        updateOfferMutation.mutate({ id: offer.id, active: checked })
                      }
                    />
                  </div>
                ))}
                {specialOffers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No special offers</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...changePasswordForm}>
              <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4">
                <FormField
                  control={changePasswordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={changePasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={changePasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Benefits</CardTitle>
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
                          <Input placeholder="Enter new benefit" {...field} />
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.mobile}</TableCell>
                      <TableCell>{customer.points}</TableCell>
                      <TableCell>{customer.level}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePoints(customer)}
                            disabled={customer.points <= 0}
                          >
                            Delete Points
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            Delete Customer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No customers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}