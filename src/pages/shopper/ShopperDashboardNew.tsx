import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  DollarSign, 
  Star, 
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Camera,
  Package,
  Phone,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Truck,
  Eye,
  X,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/shared/DashboardCard";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import { useAuth } from "@/contexts/AuthContext";
import { useShopperJobs } from "@/hooks/useShopperJobs";
import { useMarkets } from "@/hooks/useMarkets";
import { useRealtimeJobNotifications } from "@/hooks/useRealtimeNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type JobStatus = "available" | "accepted" | "shopping" | "ready_for_delivery" | "delivered" | "completed";

const ShopperDashboardNew = () => {
  const { user, addRole } = useAuth();
  const { availableJobs, myJobs, acceptJob, completeJob, loading } = useShopperJobs();
  const { markets } = useMarkets();
  
  const [shopper, setShopper] = useState<any>(null);
  const [shopperLoading, setShopperLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [mapDialog, setMapDialog] = useState(false);
  const [onboardingModal, setOnboardingModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState("");
  
  // Confirmation dialogs
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    type: "accept" | "reject" | "start" | "ready" | "complete";
    job: any;
  }>({ open: false, type: "accept", job: null });
  
  // Job detail view
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobDetailModal, setJobDetailModal] = useState(false);

  useRealtimeJobNotifications(shopper?.id);

  // Fetch shopper profile
  useEffect(() => {
    const fetchShopper = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("shoppers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setShopper(data);
        setIsAvailable(data.is_available ?? true);
      } else {
        setOnboardingModal(true);
      }
      setShopperLoading(false);
    };

    fetchShopper();
  }, [user]);

  const handleCreateShopper = async () => {
    if (!user || !selectedMarket) return;

    const { data, error } = await supabase
      .from("shoppers")
      .insert({
        user_id: user.id,
        market_id: selectedMarket,
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create shopper profile");
      return;
    }

    await addRole("shopper");
    setShopper(data);
    setOnboardingModal(false);
    toast.success("Shopper profile created!");
  };

  const handleAvailabilityToggle = async (available: boolean) => {
    if (!shopper) return;
    setIsAvailable(available);
    
    await supabase
      .from("shoppers")
      .update({ is_available: available })
      .eq("id", shopper.id);
    
    toast.success(available ? "You're now available for jobs" : "You're now offline");
  };

  const handleConfirmAction = async () => {
    const { type, job } = confirmAction;
    if (!job || !shopper) return;

    try {
      switch (type) {
        case "accept":
          await acceptJob(job.id);
          toast.success("Job accepted! Start shopping now.");
          break;
        case "reject":
          // Just close - job remains available for others
          toast.info("Job declined");
          break;
        case "start":
          await supabase
            .from("shopper_jobs")
            .update({ status: "in_progress" })
            .eq("id", job.id);
          toast.success("Shopping started!");
          break;
        case "ready":
          await supabase
            .from("shopper_jobs")
            .update({ status: "ready_for_delivery" })
            .eq("id", job.id);
          toast.success("Order marked ready for delivery!");
          break;
        case "complete":
          await completeJob(job.id);
          toast.success("Job completed! Payment will be processed.");
          break;
      }
    } catch {
      toast.error("Action failed. Please try again.");
    }

    setConfirmAction({ open: false, type: "accept", job: null });
  };

  const openConfirmDialog = (type: "accept" | "reject" | "start" | "ready" | "complete", job: any) => {
    setConfirmAction({ open: true, type, job });
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      available: "Pending Assignment",
      accepted: "Accepted",
      in_progress: "Shopping In Progress",
      ready_for_delivery: "Ready for Delivery",
      awaiting_approval: "Awaiting Customer Approval",
      delivered: "Completed",
      completed: "Completed"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      available: "bg-muted text-muted-foreground",
      accepted: "bg-secondary/20 text-secondary",
      in_progress: "bg-primary/20 text-primary",
      ready_for_delivery: "bg-gold/20 text-gold",
      awaiting_approval: "bg-accent/20 text-accent-foreground",
      delivered: "bg-success/20 text-success",
      completed: "bg-success/20 text-success"
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  if (shopperLoading) {
    return (
      <DashboardLayout role="shopper" title="Shopper Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const activeJobs = myJobs.filter(j => ["accepted", "in_progress", "ready_for_delivery"].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === "delivered" || j.status === "completed");
  const totalEarnings = completedJobs.reduce((sum, j) => sum + Number(j.commission_amount || 0), 0);

  return (
    <DashboardLayout role="shopper" title="Shopper Dashboard">
      {/* Onboarding Modal */}
      <Dialog open={onboardingModal} onOpenChange={setOnboardingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Become a KwikMarket Shopper</DialogTitle>
            <DialogDescription>
              As a shopper, you'll help customers by picking up their orders from market vendors and earning commissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Your Market</Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name} - {market.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreateShopper} disabled={!selectedMarket}>
              Start as Shopper
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction.open} onOpenChange={(open) => !open && setConfirmAction({ ...confirmAction, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === "accept" && "Accept this job?"}
              {confirmAction.type === "reject" && "Decline this job?"}
              {confirmAction.type === "start" && "Start shopping?"}
              {confirmAction.type === "ready" && "Mark as ready for delivery?"}
              {confirmAction.type === "complete" && "Complete this job?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === "accept" && "You will be assigned to this order and must complete it."}
              {confirmAction.type === "reject" && "This job will remain available for other shoppers."}
              {confirmAction.type === "start" && "This will notify the customer that you're shopping their order."}
              {confirmAction.type === "ready" && "The customer will be notified that their order is ready."}
              {confirmAction.type === "complete" && "Make sure the customer has received and approved their items."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction.type === "reject" ? "Decline" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Detail Modal */}
      <Dialog open={jobDetailModal} onOpenChange={setJobDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-bold">{selectedJob.order?.order_number}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(selectedJob.status)}>
                  {getStatusLabel(selectedJob.status)}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Commission</span>
                <span className="font-display text-xl font-bold text-success">
                  ₵{Number(selectedJob.commission_amount || 0).toFixed(2)}
                </span>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Items to Pick Up</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedJob.order?.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span>{item.quantity}x {item.product_name}</span>
                      {item.notes && <span className="text-muted-foreground italic">{item.notes}</span>}
                    </div>
                  )) || <p className="text-muted-foreground text-sm">No items data</p>}
                </div>
              </div>
              
              {selectedJob.order?.special_instructions && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Special Instructions</h4>
                  <p className="text-sm text-muted-foreground">{selectedJob.order.special_instructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-6">
        {/* Availability Toggle */}
        <Card className={`${isAvailable ? "bg-success/5 border-success/30" : "bg-muted"}`}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isAvailable ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
              <div>
                <p className="font-bold">{isAvailable ? "You're Online" : "You're Offline"}</p>
                <p className="text-sm text-muted-foreground">
                  {isAvailable ? "Ready to accept jobs" : "Toggle to go online"}
                </p>
              </div>
            </div>
            <Switch checked={isAvailable} onCheckedChange={handleAvailabilityToggle} />
          </CardContent>
        </Card>

        {/* Quick Stats - Mobile optimized grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <DashboardCard
            title="Available Jobs"
            value={availableJobs.length}
            icon={Briefcase}
            variant={availableJobs.length > 0 ? "secondary" : "default"}
          />
          <DashboardCard
            title="Active Jobs"
            value={activeJobs.length}
            icon={Package}
            variant="primary"
          />
          <DashboardCard
            title="Earnings"
            value={`₵${totalEarnings.toFixed(0)}`}
            icon={DollarSign}
            variant="success"
          />
          <DashboardCard
            title="Rating"
            value={shopper?.rating?.toFixed(1) || "0.0"}
            icon={Star}
            variant="gold"
          />
        </div>

        {/* Active Job Banner */}
        {activeJobs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <Badge className="mb-2">Active Job</Badge>
                    <p className="font-bold text-lg">Order #{activeJobs[0].order?.order_number}</p>
                    <Badge className={`mt-1 ${getStatusColor(activeJobs[0].status)}`}>
                      {getStatusLabel(activeJobs[0].status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeJobs[0].status === "accepted" && (
                      <Button size="sm" onClick={() => openConfirmDialog("start", activeJobs[0])}>
                        <ShoppingBag className="w-4 h-4 mr-2" /> Start Shopping
                      </Button>
                    )}
                    {activeJobs[0].status === "in_progress" && (
                      <Button size="sm" variant="hero" onClick={() => openConfirmDialog("ready", activeJobs[0])}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Ready
                      </Button>
                    )}
                    {activeJobs[0].status === "ready_for_delivery" && (
                      <Button size="sm" variant="hero" onClick={() => openConfirmDialog("complete", activeJobs[0])}>
                        <Truck className="w-4 h-4 mr-2" /> Complete Delivery
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setMapDialog(true)}>
                      <Navigation className="w-4 h-4 mr-2" /> Route
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs" className="relative">
              Jobs
              {availableJobs.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {availableJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {/* Today's Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Today's Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground text-sm">Jobs Completed</span>
                    <span className="font-bold">{completedJobs.filter(j => {
                      const today = new Date().toDateString();
                      return new Date(j.delivered_at || "").toDateString() === today;
                    }).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground text-sm">Earnings Today</span>
                    <span className="font-bold text-success">₵{completedJobs.filter(j => {
                      const today = new Date().toDateString();
                      return new Date(j.delivered_at || "").toDateString() === today;
                    }).reduce((sum, j) => sum + Number(j.commission_amount || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <span className="text-muted-foreground text-sm">Total Deliveries</span>
                    <span className="font-bold">{shopper?.total_deliveries || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-16 md:h-20 flex-col text-xs md:text-sm" onClick={() => setActiveTab("jobs")}>
                    <Briefcase className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    View Jobs
                  </Button>
                  <Button variant="outline" className="h-16 md:h-20 flex-col text-xs md:text-sm" onClick={() => setMapDialog(true)}>
                    <MapPin className="w-5 h-5 md:w-6 md:h-6 mb-1 md:mb-2" />
                    Market Map
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4 mt-4">
            <h2 className="font-display text-lg md:text-xl font-bold">Available Jobs</h2>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : availableJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-lg md:text-xl font-bold mb-2">No jobs available</h3>
                <p className="text-muted-foreground text-sm">New jobs will appear here when customers place orders</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {availableJobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold">Order #{job.order?.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Pickup from vendor
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Earn</p>
                          <p className="font-display text-lg md:text-xl font-bold text-success">
                            ₵{Number(job.commission_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="truncate">{markets.find(m => m.id === job.order?.market_id)?.name || "Market"}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={() => { setSelectedJob(job); setJobDetailModal(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openConfirmDialog("reject", job)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => openConfirmDialog("accept", job)}
                        >
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* My Active Jobs */}
            {activeJobs.length > 0 && (
              <>
                <h2 className="font-display text-lg md:text-xl font-bold mt-6">My Active Jobs</h2>
                <div className="space-y-3 md:space-y-4">
                  {activeJobs.map((job) => (
                    <Card key={job.id} className="border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold">Order #{job.order?.order_number}</p>
                            <Badge className={`mt-1 ${getStatusColor(job.status)}`}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-lg font-bold text-success">
                              ₵{Number(job.commission_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setSelectedJob(job); setJobDetailModal(true); }}
                          >
                            <Eye className="w-4 h-4 mr-1" /> Details
                          </Button>
                          {job.status === "accepted" && (
                            <Button size="sm" onClick={() => openConfirmDialog("start", job)}>
                              <ShoppingBag className="w-4 h-4 mr-1" /> Start Shopping
                            </Button>
                          )}
                          {job.status === "in_progress" && (
                            <Button size="sm" variant="hero" onClick={() => openConfirmDialog("ready", job)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Ready
                            </Button>
                          )}
                          {job.status === "ready_for_delivery" && (
                            <Button size="sm" variant="hero" onClick={() => openConfirmDialog("complete", job)}>
                              <Truck className="w-4 h-4 mr-1" /> Complete
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <h2 className="font-display text-lg md:text-xl font-bold">Completed Jobs</h2>
            
            {completedJobs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-display text-lg md:text-xl font-bold mb-2">No completed jobs yet</h3>
                <p className="text-muted-foreground text-sm">Your completed jobs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">Order #{job.order?.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.delivered_at ? new Date(job.delivered_at).toLocaleDateString() : "Completed"}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status="completed" />
                          <p className="font-display text-lg font-bold text-success mt-1">
                            +₵{Number(job.commission_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Map Dialog */}
        <Dialog open={mapDialog} onOpenChange={setMapDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Delivery Route</DialogTitle>
            </DialogHeader>
            <div className="h-64 md:h-80">
              <OrderTrackingMap
                shopperLocation={{ lat: 5.6037, lng: -0.1870, label: "Your Location" }}
                marketLocation={{ lat: 5.5500, lng: -0.2000, label: "Market" }}
                customerLocation={{ lat: 5.6200, lng: -0.1750, label: "Customer" }}
                orderStatus="picked_up"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ShopperDashboardNew;