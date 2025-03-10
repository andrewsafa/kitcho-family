import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type InsertPointTransaction, type LevelBenefit, type SpecialOffer, type PointTransaction, type Partner, type InsertPartner, insertPointTransactionSchema, insertLevelBenefitSchema, insertSpecialOfferSchema, insertPartnerSchema } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Download, Upload, Settings, CreditCard, Gift, Award, Cog, Users, Key, Briefcase } from "lucide-react";
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
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");

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

  // Partners data query
  const { data: partners = [], isLoading: isLoadingPartners } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
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

  // Add form for partners
  const partnerForm = useForm({
    resolver: zodResolver(insertPartnerSchema),
    defaultValues: {
      username: "",
      name: "",
      password: "partner123" // Default password
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

  // Partner mutations
  const createPartnerMutation = useMutation({
    mutationFn: async (data: InsertPartner) => {
      const res = await apiRequest("POST", "/api/admin/partners", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Partner created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      partnerForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error creating partner",
        description: error.message
      });
    }
  });

  const resetPartnerPasswordMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const res = await apiRequest("POST", `/api/admin/partners/${partnerId}/reset-password`, {
        newPassword: "partner123" // Default password for reset
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Partner password reset successfully",
        description: "Password has been reset to 'partner123'"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive", 
        title: "Error resetting partner password",
        description: error.message
      });
    }
  });

  const updatePartnerStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/partners/${id}/status`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Partner status updated" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating partner status",
        description: error.message
      });
    }
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/partners/${partnerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Partner deleted successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting partner",
        description: error.message
      });
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

  // Add password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await apiRequest("POST", `/api/admin/customers/${customerId}/reset-password`, {
        newPassword: "new123" // Default password for reset
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Password reset successfully",
        description: `Customer password has been reset to 'new123'`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error resetting password",
        description: error.message
      });
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

  const handleResetPassword = (customer: Customer) => {
    if (window.confirm(`Reset password for ${customer.name} to 'new123'?`)) {
      resetPasswordMutation.mutate(customer.id);
    }
  };

  const handleResetPartnerPassword = (partner: Partner) => {
    if (window.confirm(`Reset password for partner ${partner.name} to 'partner123'?`)) {
      resetPartnerPasswordMutation.mutate(partner.id);
    }
  };

  const handleDeletePartner = (partner: Partner) => {
    if (window.confirm(`Are you sure you want to delete partner ${partner.name}?`)) {
      deletePartnerMutation.mutate(partner.id);
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

  const onPartnerSubmit = (data: InsertPartner) => {
    createPartnerMutation.mutate(data);
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

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(partnerSearchTerm.toLowerCase()) ||
    partner.username.toLowerCase().includes(partnerSearchTerm.toLowerCase())
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
          <TabsList className="grid grid-cols-6 gap-4 h-auto p-1">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Points
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Partners
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
                          <TableHead>Verification Code</TableHead>
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
                              <span className="font-mono text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                                {customer.verificationCode || "—"}
                              </span>
                            </TableCell>
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
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetPassword(customer)}
                                >
                                  <Key className="h-3 w-3 mr-1" />
                                  Reset Password
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeletePoints(customer)}
                                >
                                  Deduct Points
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCustomer(customer)}
                                >
                                  Delete
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

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <CardTitle>Partner Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Form {...partnerForm}>
                    <form onSubmit={partnerForm.handleSubmit(onPartnerSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={partnerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter partner username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={partnerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter partner name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={partnerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter partner password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={createPartnerMutation.isPending}
                        className="mt-2"
                      >
                        Create Partner
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Partner Accounts</h3>
                      <Input
                        placeholder="Search partners..."
                        value={partnerSearchTerm}
                        onChange={(e) => setPartnerSearchTerm(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingPartners ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4">
                                Loading partner accounts...
                              </TableCell>
                            </TableRow>
                          ) : filteredPartners.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                No partner accounts found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredPartners.map((partner) => (
                              <TableRow key={partner.id}>
                                <TableCell className="font-medium">{partner.username}</TableCell>
                                <TableCell>{partner.name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={partner.active}
                                      onCheckedChange={(checked) => {
                                        updatePartnerStatusMutation.mutate({
                                          id: partner.id,
                                          active: checked
                                        });
                                      }}
                                    />
                                    <span>{partner.active ? "Active" : "Inactive"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {partner.createdAt ? format(new Date(partner.createdAt), 'MMM d, yyyy') : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleResetPartnerPassword(partner)}
                                    >
                                      <Key className="h-3 w-3 mr-1" />
                                      Reset Password
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleDeletePartner(partner)}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
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
                      <Button type="submit" disabled={addOfferMutation.isPending}>
                        Add Offer
                      </Button>
                    </form>
                  </Form>

                  {/* List of special offers for selected level */}
                  <div className="rounded-md border mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getLevelOffers(offerLevel).map((offer) => (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">{offer.title}</TableCell>
                            <TableCell>{offer.description}</TableCell>
                            <TableCell>
                              {new Date(offer.validUntil).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={offer.active}
                                onCheckedChange={(checked) => {
                                  updateOfferMutation.mutate({
                                    id: offer.id,
                                    active: checked
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Delete offer "${offer.title}"?`)) {
                                    deleteOfferMutation.mutate(offer.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
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
                              <Input placeholder="Enter benefit description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={addBenefitMutation.isPending}>
                        Add Benefit
                      </Button>
                    </form>
                  </Form>

                  {/* List of benefits for selected level */}
                  <div className="rounded-md border mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Benefit</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getLevelBenefits(selectedLevel).map((benefit) => (
                          <TableRow key={benefit.id}>
                            <TableCell className="font-medium">{benefit.benefit}</TableCell>
                            <TableCell>
                              <Switch
                                checked={benefit.active}
                                onCheckedChange={(checked) => {
                                  updateBenefitMutation.mutate({
                                    id: benefit.id,
                                    active: checked
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`Delete benefit "${benefit.benefit}"?`)) {
                                    deleteBenefitMutation.mutate(benefit.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Change admin password form */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Change Admin Password</h3>
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
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                          Change Password
                        </Button>
                      </form>
                    </Form>
                  </div>

                  {/* Backup settings */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Backup Settings</h3>
                      <Button
                        variant="outline"
                        onClick={() => setShowBackupSettings(!showBackupSettings)}
                      >
                        {showBackupSettings ? "Hide Settings" : "Show Settings"}
                      </Button>
                    </div>

                    {showBackupSettings && backupConfig && (
                      <div className="space-y-4 p-4 border rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Backup Frequency</label>
                            <Select
                              value={backupConfig.frequency}
                              onValueChange={(value) => {
                                updateBackupConfigMutation.mutate({
                                  ...backupConfig,
                                  frequency: value
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0 0 * * *">Daily (Midnight)</SelectItem>
                                <SelectItem value="0 0 * * 0">Weekly (Sunday)</SelectItem>
                                <SelectItem value="0 0 1 * *">Monthly (1st day)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Max Backups to Keep</label>
                            <Input
                              type="number"
                              value={backupConfig.maxBackups}
                              onChange={(e) => {
                                updateBackupConfigMutation.mutate({
                                  ...backupConfig,
                                  maxBackups: parseInt(e.target.value)
                                });
                              }}
                              min={1}
                              max={30}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">Backup History</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {backupHistory.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                  No backup history available
                                </TableCell>
                              </TableRow>
                            ) : (
                              backupHistory.map((backup, index) => (
                                <TableRow key={index}>
                                  <TableCell>{format(new Date(backup.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                                  <TableCell>{backup.success !== false ? "Success" : "Failed"}</TableCell>
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
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Member History Dialog */}
        <Dialog open={!!selectedMemberHistory} onOpenChange={(open) => !open && setSelectedMemberHistory(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Point Transaction History</DialogTitle>
              <DialogDescription>
                {selectedMemberHistory?.name} ({selectedMemberHistory?.mobile})
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        Loading transaction history...
                      </TableCell>
                    </TableRow>
                  ) : historyError ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-destructive">
                        Error loading history: {historyError.message}
                      </TableCell>
                    </TableRow>
                  ) : memberHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No transaction history available
                      </TableCell>
                    </TableRow>
                  ) : (
                    memberHistory.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {transaction.timestamp ? format(new Date(transaction.timestamp), "MMM d, yyyy h:mm a") : "—"}
                        </TableCell>
                        <TableCell className={transaction.points >= 0 ? "text-green-600" : "text-red-600"}>
                          {transaction.points >= 0 ? "+" : ""}{transaction.points}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMemberHistory(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deduct Points Dialog */}
        <Dialog open={showDeductPoints} onOpenChange={setShowDeductPoints}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deduct Points</DialogTitle>
              <DialogDescription>
                Deduct points from {customerToDeduct?.name} (Current: {customerToDeduct?.points} points)
              </DialogDescription>
            </DialogHeader>
            {customerToDeduct && (
              <Form {...deductPointsForm}>
                <form
                  onSubmit={deductPointsForm.handleSubmit((data) => {
                    deductPointsMutation.mutate({
                      customerId: customerToDeduct.id,
                      points: data.points,
                      reason: data.reason
                    });
                  })}
                  className="space-y-4"
                >
                  <FormField
                    control={deductPointsForm.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points to Deduct</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            min={1}
                            max={customerToDeduct.points}
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
                          <Input {...field} placeholder="Reason for deducting points" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeductPoints(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={deductPointsMutation.isPending}
                    >
                      Deduct Points
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}