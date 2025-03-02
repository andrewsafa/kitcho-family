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
import { Search, Download, Upload, Settings, CreditCard, Calendar, Gift, Award, Cog, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { format } from "date-fns";
import { showNotification, notifyPointsAdded, notifySpecialEvent, notifySpecialOffer, requestNotificationPermission } from "@/lib/notifications";

// ... [keep all the existing interface definitions and other imports]

export default function AdminDashboard() {
  // ... [keep all the existing state and hooks]

  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [eventLevel, setEventLevel] = useState("Bronze");
  const [offerLevel, setOfferLevel] = useState("Bronze");

  // ... [keep all the existing query hooks and mutations]

  const handleSearch = async (mobile: string) => {
    const results = customers.filter(c => 
      c.mobile.toLowerCase().includes(mobile.toLowerCase()) ||
      c.name.toLowerCase().includes(mobile.toLowerCase())
    );
    setSearchResults(results);
  };

  // Filter customers for the Members tab
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    customer.mobile.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    customer.level.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Keep the existing header with logo and backup buttons */}
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
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Events
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

          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle>Add Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Input 
                      placeholder="Search by phone number" 
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Search Results</h3>
                      <div className="space-y-2">
                        {searchResults.map((customer) => (
                          <div 
                            key={customer.id} 
                            className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              form.setValue("mobile", customer.mobile);
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{customer.points} points</p>
                                <p className="text-sm text-muted-foreground">{customer.level} Level</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Special Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Select
                    value={eventLevel}
                    onValueChange={setEventLevel}
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

                  <Form {...eventForm}>
                    <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4">
                      {/* Keep existing event form fields */}
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
                    <h3>Active Events for {eventLevel}</h3>
                    {specialEvents
                      .filter(event => event.level === eventLevel)
                      .map((event) => (
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
                    {specialEvents.filter(event => event.level === eventLevel).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No special events for {eventLevel} level</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                      {/* Keep existing offer form fields */}
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
                              <Input {...field} value={offerLevel} />
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
                    <h3>Active Offers for {offerLevel}</h3>
                    {specialOffers
                      .filter(offer => offer.level === offerLevel)
                      .map((offer) => (
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
                    {specialOffers.filter(offer => offer.level === offerLevel).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No special offers for {offerLevel} level</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keep existing Benefits and Settings tabs */}
          <TabsContent value="benefits">
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

                  {/* Keep existing benefit form and list */}
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

                  <div className="space-y-4">
                    <h3>Active Benefits for {selectedLevel}</h3>
                    {benefits.map((benefit) => (
                      <div key={benefit.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{benefit.benefit}</h4>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newBenefit = window.prompt("Enter new benefit description:", benefit.benefit);
                              if (newBenefit) {
                                updateBenefitMutation.mutate({
                                  id: benefit.id,
                                  updates: { benefit: newBenefit }
                                });
                              }
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this benefit?")) {
                                deleteBenefitMutation.mutate(benefit.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                          <Switch
                            checked={benefit.active}
                            onCheckedChange={(checked) =>
                              updateBenefitMutation.mutate({ id: benefit.id, updates: { active: checked } })
                            }
                          />
                        </div>
                      </div>
                    ))}
                    {benefits.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No benefits for this level</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            {/* Keep existing settings tab content */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Backup Configuration</h3>
                    <Button
                      onClick={() => setShowBackupSettings(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Configure Backup Settings
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                    <Form {...changePasswordForm}>
                      <form
                        onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)}
                        className="space-y-4"
                      >
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
                        <Button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                        >
                          Change Password
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Keep existing backup settings dialog */}
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
                <label className="text-sm font-medium">Email Notifications</label>
                <Input
                  type="email"
                  placeholder="Enter email address for backup notifications"
                  value={backupConfig?.emailTo || ''}
                  onChange={(e) =>
                    updateBackupConfigMutation.mutate({
                      emailTo: e.target.value
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Backups will be automatically sent to this email address
                </p>
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
      </div>
    </div>
  );
}