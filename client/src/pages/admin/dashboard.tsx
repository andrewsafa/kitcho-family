import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type InsertPointTransaction, type LevelBenefit, type SpecialOffer, type PointTransaction, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialOfferSchema } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Download, Upload, Settings, CreditCard, Gift, Award, Cog, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { format } from "date-fns";
import { showNotification, notifyPointsAdded, notifySpecialOffer, requestNotificationPermission } from "@/lib/notifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [offerLevel, setOfferLevel] = useState("Bronze");
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("Bronze");
  const [showDeductPoints, setShowDeductPoints] = useState(false);
  const [customerToDeduct, setCustomerToDeduct] = useState<Customer | null>(null);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<Customer | null>(null);

  // Query hooks for common data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: backupConfig } = useQuery<any>({
    queryKey: ["/api/backup/config"],
  });

  const { data: backupHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/backup/history"],
  });

  // Level-specific queries
  const { data: bronzeBenefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: ["/api/benefits/Bronze"],
  });

  const { data: silverBenefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: ["/api/benefits/Silver"],
  });

  const { data: goldBenefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: ["/api/benefits/Gold"],
  });

  const { data: diamondBenefits = [] } = useQuery<LevelBenefit[]>({
    queryKey: ["/api/benefits/Diamond"],
  });

  const { data: bronzeOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/offers/Bronze"],
  });

  const { data: silverOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/offers/Silver"],
  });

  const { data: goldOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/offers/Gold"],
  });

  const { data: diamondOffers = [] } = useQuery<SpecialOffer[]>({
    queryKey: ["/api/offers/Diamond"],
  });

  // Member transaction history query
  const { data: memberHistory = [], isLoading: isLoadingHistory, error: historyError } = useQuery<PointTransaction[]>({
    queryKey: ["/api/customers", selectedMemberHistory?.id, "transactions"],
    queryFn: async () => {
      if (!selectedMemberHistory) return [];
      const res = await apiRequest("GET", `/api/customers/${selectedMemberHistory.id}/transactions`);
      if (!res.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      return res.json();
    },
    enabled: !!selectedMemberHistory
  });

  // Form schemas
  const formSchema = z.object({
    mobile: z.string(),
    points: z.coerce.number(),
    description: z.string().min(1, "Description is required"),
  });

  // Forms
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mobile: "",
      points: 0,
      description: ""
    }
  });

  const offerForm = useForm({
    resolver: zodResolver(insertSpecialOfferSchema),
    defaultValues: {
      title: "",
      description: "",
      level: offerLevel,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  const benefitForm = useForm({
    resolver: zodResolver(insertLevelBenefitSchema),
    defaultValues: {
      level: selectedLevel,
      benefit: ""
    }
  });

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

  // Add form for deducting points
  const deductPointsForm = useForm({
    resolver: zodResolver(z.object({
      points: z.coerce.number()
        .min(1, "Must deduct at least 1 point")
        .refine(val => !customerToDeduct || val <= customerToDeduct.points,
          "Cannot deduct more points than customer has"),
      reason: z.string().min(1, "Reason is required"),
    })),
    defaultValues: {
      points: 0,
      reason: "",
    }
  });

  // Mutations
  const addPointsMutation = useMutation({
    mutationFn: async (data: InsertPointTransaction) => {
      const res = await apiRequest("POST", "/api/points", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Points added successfully" });
      notifyPointsAdded(data.points, data.points);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", data.customerId, "transactions"] });
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

  const addOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/offers", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Special offer created successfully" });
      notifySpecialOffer(data.title, new Date(data.validUntil));
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${data.level}`] });
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
    onSuccess: (offer) => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offer.level}`] });
    }
  });

  // Add delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/offers/${id}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Find the level of the deleted offer to know which query to invalidate
      const offer =
        bronzeOffers.find(o => o.id === variables) ||
        silverOffers.find(o => o.id === variables) ||
        goldOffers.find(o => o.id === variables) ||
        diamondOffers.find(o => o.id === variables);

      if (offer) {
        queryClient.invalidateQueries({ queryKey: [`/api/offers/${offer.level}`] });
        toast({ title: "Offer deleted successfully!" });
      } else {
        // If we can't determine the level, invalidate all offer queries
        queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      }
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error deleting offer", description: error.message });
    }
  });

  const addBenefitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/benefits", data);
      return res.json();
    },
    onSuccess: (benefit) => {
      toast({ title: "Benefit added successfully!" });
      queryClient.invalidateQueries({ queryKey: [`/api/benefits/${benefit.level}`] });
      benefitForm.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const updateBenefitMutation = useMutation({
    mutationFn: async (data: Partial<LevelBenefit>) => {
      const res = await apiRequest("PATCH", `/api/benefits/${data.id}`, data);
      return res.json();
    },
    onSuccess: (benefit) => {
      queryClient.invalidateQueries({ queryKey: [`/api/benefits/${benefit.level}`] });
    }
  });

  const deleteBenefitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/benefits/${id}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Find the level of the deleted benefit to know which query to invalidate
      const benefit =
        bronzeBenefits.find(b => b.id === variables) ||
        silverBenefits.find(b => b.id === variables) ||
        goldBenefits.find(b => b.id === variables) ||
        diamondBenefits.find(b => b.id === variables);

      if (benefit) {
        queryClient.invalidateQueries({ queryKey: [`/api/benefits/${benefit.level}`] });
      } else {
        // If we can't determine the level, invalidate all benefit queries
        queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      }
    }
  });

  const updateBackupConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const res = await apiRequest("POST", "/api/backup/config", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/config"] });
      toast({ title: "Backup configuration updated" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error updating backup configuration", description: error.message });
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backup/run");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to run backup");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/history"] });
      toast({ title: "Backup created successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error creating backup", description: error.message });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      changePasswordForm.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  });

  const deductPointsMutation = useMutation({
    mutationFn: async (data: { customerId: number; points: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/points/delete", {
        customerId: data.customerId,
        points: data.points,
        description: data.reason
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Points deducted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerToDeduct?.id, "transactions"] });
      setShowDeductPoints(false);
      setCustomerToDeduct(null);
      deductPointsForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deducting points",
        description: error.message
      });
    }
  });

  const handleDeleteCustomer = async (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        await apiRequest("DELETE", `/api/customers/${customer.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        toast({ title: `${customer.name} deleted successfully` });
      } catch (error) {
        toast({ variant: "destructive", title: "Error deleting customer", description: (error as Error).message });
      }
    }
  };

  const handleDeletePoints = (customer: Customer) => {
    setCustomerToDeduct(customer);
    setShowDeductPoints(true);
    deductPointsForm.reset();
  };

  const handleBackup = async () => {
    try {
      runBackupMutation.mutate();
    } catch (error) {
      toast({ variant: "destructive", title: "Error initiating backup", description: (error as Error).message });
    }
  };

  const handleRestore = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result;
          if (typeof content === 'string') {
            try {
              const data = JSON.parse(content);
              const res = await apiRequest("POST", "/api/restore", data);
              if (res.ok) {
                toast({ title: "Restore completed successfully" });
                // Refresh data
                queryClient.invalidateQueries();
              } else {
                const errorText = await res.text();
                toast({ variant: "destructive", title: "Error restoring data", description: errorText });
              }
            } catch (error) {
              toast({ variant: "destructive", title: "Error processing backup file", description: (error as Error).message });
            }
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  const onBenefitSubmit = (data: any) => {
    console.log("Adding benefit:", { ...data, level: selectedLevel });
    addBenefitMutation.mutate({ ...data, level: selectedLevel });
  };

  const onChangePasswordSubmit = (data: any) => {
    changePasswordMutation.mutate(data);
  };

  // Event handlers
  const handleSearch = async (mobile: string) => {
    if (!mobile) {
      setSearchResults([]);
      return;
    }
    const results = customers.filter(c =>
      c.mobile.toLowerCase().includes(mobile.toLowerCase()) ||
      c.name.toLowerCase().includes(mobile.toLowerCase())
    );
    setSearchResults(results);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedCustomer) return;

    const transactionData: InsertPointTransaction = {
      customerId: selectedCustomer.id,
      points: data.points,
      description: data.description
    };

    addPointsMutation.mutate(transactionData);
  };

  const onOfferSubmit = (data: any) => {
    console.log("Adding offer:", { ...data, level: offerLevel });
    const offerData = {
      ...data,
      level: offerLevel
    };
    addOfferMutation.mutate(offerData);
  };

  // Filter data
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    customer.mobile.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    customer.level.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  // Get level-specific data
  const getLevelBenefits = (level: string) => {
    switch (level) {
      case "Bronze": return bronzeBenefits;
      case "Silver": return silverBenefits;
      case "Gold": return goldBenefits;
      case "Diamond": return diamondBenefits;
      default: return [];
    }
  };

  const getLevelOffers = (level: string) => {
    switch (level) {
      case "Bronze": return bronzeOffers;
      case "Silver": return silverOffers;
      case "Gold": return goldOffers;
      case "Diamond": return diamondOffers;
      default: return [];
    }
  };

  // Effects
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Update form default values when levels change
  useEffect(() => {
    offerForm.setValue("level", offerLevel);
  }, [offerLevel, offerForm]);

  useEffect(() => {
    benefitForm.setValue("level", selectedLevel);
  }, [selectedLevel, benefitForm]);

  // JSX
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with logo and backup buttons */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Kitcho Family Logo" className="h-24 mx-auto" />
          <h1 className="text-2xl font-bold mt-4">Admin Dashboard</h1>
          <div className="flex justify-center gap-4 mt-4">
            <Button onClick={handleBackup} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Backup Data
            </Button>
            <Button onClick={handleRestore} variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Restore Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="grid grid-cols-5 gap-4 h-auto p-1">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Points
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="offers" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Offers
            </TabsTrigger>
            <TabsTrigger value="benefits" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Benefits
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Points Tab */}
          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Add Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Input
                      placeholder="Search by phone number or name"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((customer) => (
                            <TableRow key={customer.id}>
                              <TableCell>{customer.name}</TableCell>
                              <TableCell>{customer.mobile}</TableCell>
                              <TableCell>{customer.level}</TableCell>
                              <TableCell>{customer.points}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    form.setValue("mobile", customer.mobile);
                                  }}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {selectedCustomer && (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex gap-4">
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
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Member List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search members by name, phone, or level..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>{customer.name}</TableCell>
                            <TableCell>{customer.mobile}</TableCell>
                            <TableCell>{customer.level}</TableCell>
                            <TableCell>{customer.points}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedMemberHistory(customer)}
                                >
                                  View History
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCustomer(customer)}
                                >
                                  Delete
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeletePoints(customer)}
                                >
                                  Deduct Points
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers">
            <Card>
              <CardHeader>
                <CardTitle>Special Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Select
                    value={offerLevel}
                    onValueChange={setOfferLevel}
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
                        name="imagePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Offer Image (Optional)</FormLabel>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="text"
                                placeholder="Image path"
                                {...field}
                                value={field.value || ""}
                                className="flex-1"
                                readOnly
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      const formData = new FormData();
                                      formData.append("image", file);

                                      try {
                                        const res = await fetch("/api/offers/image", {
                                          method: "POST",
                                          body: formData,
                                        });

                                        if (res.ok) {
                                          const data = await res.json();
                                          field.onChange(data.imagePath);
                                          toast({ title: "Image uploaded successfully" });
                                        } else {
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to upload image",
                                            description: "Please try again"
                                          });
                                        }
                                      } catch (error) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error uploading image",
                                          description: (error as Error).message
                                        });
                                      }
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                Upload Image
                              </Button>
                            </div>
                            {field.value && (
                              <div className="mt-2">
                                <img
                                  src={field.value}
                                  alt="Offer preview"
                                  className="h-24 w-40 object-cover rounded"
                                />
                              </div>
                            )}
                            <FormMessage />
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

                  {/* Offers Display */}
                  <div className="mt-8 bg-white p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Offers for {offerLevel}</h3>

                    {getLevelOffers(offerLevel).length > 0 ? (
                      <div className="space-y-4">
                        {getLevelOffers(offerLevel).map(offer => (
                          <div key={offer.id} className="border p-4 rounded-lg">
                            <div className="flex justify-between">
                              <div>
                                {offer.imagePath && (
                                  <div className="mb-3">
                                    <img
                                      src={offer.imagePath}
                                      alt={offer.title}
                                      className="h-40 w-full object-cover rounded-lg"
                                    />
                                  </div>
                                )}
                                <h4 className="font-medium">{offer.title}</h4>
                                <p className="text-gray-600">{offer.description}</p>
                                <p className="mt-2 text-sm">Valid until: {new Date(offer.validUntil).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-start gap-2 ml-4">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this offer?")) {
                                      deleteOfferMutation.mutate(offer.id);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                                <div className="flex flex-col items-center">
                                  <span>{offer.active ? "Active" : "Inactive"}</span>
                                  <Switch
                                    checked={offer.active}
                                    onCheckedChange={(checked) => {
                                      updateOfferMutation.mutate({ id: offer.id, active: checked });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center p-4 border rounded-lg">No offers found for {offerLevel} level</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <Card>
              <CardHeader>
                <CardTitle>Level Benefits</CardTitle>
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
                            <FormLabel>Benefit Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter benefit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={benefitForm.control}
                        name="imagePath"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Benefit Image (Optional)</FormLabel>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="text"
                                placeholder="Image path"
                                {...field}
                                value={field.value || ""}
                                className="flex-1"
                                readOnly
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      const formData = new FormData();
                                      formData.append("image", file);

                                      try {
                                        const res = await fetch("/api/benefits/image", {
                                          method: "POST",
                                          body: formData,
                                        });

                                        if (res.ok) {
                                          const data = await res.json();
                                          field.onChange(data.imagePath);
                                          toast({ title: "Image uploaded successfully" });
                                        } else {
                                          toast({
                                            variant: "destructive",
                                            title: "Failed to upload image",
                                            description: "Please try again"
                                          });
                                        }
                                      } catch (error) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error uploading image",
                                          description: (error as Error).message
                                        });
                                      }
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                Upload Image
                              </Button>
                            </div>
                            {field.value && (
                              <div className="mt-2">
                                <img
                                  src={field.value}
                                  alt="Benefit preview"
                                  className="h-12 w-12 object-cover rounded"
                                />
                              </div>
                            )}
                            <FormMessage />
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

                  {/* Benefits Display */}
                  <div className="mt-8 bg-white p-4 rounded-lg border">
                    <h3 className="text-lg font-medium mb-4">Benefits for {selectedLevel}</h3>

                    {getLevelBenefits(selectedLevel).length > 0 ? (
                      <div className="space-y-4">
                        {getLevelBenefits(selectedLevel).map(benefit => (
                          <div key={benefit.id} className="border p-4 rounded-lg">
                            <div className="flex justify-between">
                              <div className="flex items-center gap-3">
                                {benefit.imagePath && (
                                  <img
                                    src={benefit.imagePath}
                                    alt="Benefit"
                                    className="h-10 w-10 object-cover rounded-full"
                                  />
                                )}
                                <p>{benefit.benefit}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteBenefitMutation.mutate(benefit.id)}
                                >
                                  Delete
                                </Button>
                                <span>{benefit.active ? "Active" : "Inactive"}</span>
                                <Switch
                                  checked={benefit.active}
                                  onCheckedChange={(checked) => {
                                    updateBenefitMutation.mutate({ id: benefit.id, active: checked });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center p-4 border rounded-lg">No benefits found for {selectedLevel} level</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Change Admin Password</CardTitle>
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
                            <Input type="password" autoComplete="current-password" {...field} />
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
                            <Input type="password" autoComplete="new-password" {...field} />
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
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      Change Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Button onClick={() => setShowBackupSettings(true)}>
                    Configure Automatic Backup
                  </Button>

                  <h3 className="text-lg font-medium mt-6">Backup History</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backupHistory.map((backup, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(backup.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                            <TableCell>{backup.success !== false ? "Success" : "Failed"}</TableCell>
                            <TableCell>{backup.filename || "N/A"}</TableCell>
                            <TableCell>
                              {backup.filename && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/api/backup/download/${backup.filename}`, '_blank')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {backupHistory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              No backup history available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Backup Settings Dialog */}
        <Dialog open={showBackupSettings} onOpenChange={setShowBackupSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Backup Configuration</DialogTitle>
              <DialogDescription>
                Configure automatic backup settings
              </DialogDescription>
            </DialogHeader>
            {backupConfig && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Backup Frequency (cron)</label>
                    <Input
                      value={backupConfig.frequency}
                      onChange={(e) =>
                        updateBackupConfigMutation.mutate({
                          ...backupConfig,
                          frequency: e.target.value
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">e.g. "0 0 * * *" for daily at midnight</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Backups to Keep</label>
                    <Input
                      type="number"
                      value={backupConfig.maxBackups}
                      onChange={(e) =>
                        updateBackupConfigMutation.mutate({
                          ...backupConfig,
                          maxBackups: parseInt(e.target.value)
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email To (Optional)</label>
                    <Input
                      value={backupConfig.emailTo || ""}
                      onChange={(e) =>
                        updateBackupConfigMutation.mutate({
                          ...backupConfig,
                          emailTo: e.target.value || null
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Email to send backup files to</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enabled"
                    checked={backupConfig.enabled}
                    onCheckedChange={(checked) =>
                      updateBackupConfigMutation.mutate({
                        ...backupConfig,
                        enabled: !!checked
                      })
                    }
                  />
                  <label
                    htmlFor="enabled"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enable Automatic Backups
                  </label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowBackupSettings(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History Dialog */}
        <Dialog open={!!selectedMemberHistory} onOpenChange={(open) => !open && setSelectedMemberHistory(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Transaction History: {selectedMemberHistory?.name}
              </DialogTitle>
              <DialogDescription>
                Level: {selectedMemberHistory?.level} | Current Points: {selectedMemberHistory?.points}
              </DialogDescription>
            </DialogHeader>

            {isLoadingHistory && (
              <div className="flex justify-center my-8">
                Loading...
              </div>
            )}

            {historyError && (
              <div className="text-center text-red-500 my-8">
                Error loading transaction history
              </div>
            )}

            {!isLoadingHistory && !historyError && memberHistory.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberHistory.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={transaction.points > 0 ? "text-green-600" : "text-red-600"}>
                          {transaction.points > 0 ? "+" : ""}{transaction.points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transaction history found
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Deduct Points Dialog */}
      <Dialog open={showDeductPoints} onOpenChange={setShowDeductPoints}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Points from {customerToDeduct?.name}</DialogTitle>
            <DialogDescription>
              Current Points: {customerToDeduct?.points}
            </DialogDescription>
          </DialogHeader>

          <Form {...deductPointsForm}>
            <form onSubmit={deductPointsForm.handleSubmit((data) => {
              if (!customerToDeduct) return;
              deductPointsMutation.mutate({
                customerId: customerToDeduct.id,
                points: data.points,
                reason: data.reason
              });
            })} className="space-y-4">
              <FormField
                control={deductPointsForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points to Deduct</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max={customerToDeduct?.points || 0}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={deductPointsForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reason for deduction" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDeductPoints(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={deductPointsMutation.isPending}>
                  Deduct Points
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}