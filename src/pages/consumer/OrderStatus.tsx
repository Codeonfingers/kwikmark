import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, CheckCircle2, Clock, Truck, MapPin, ArrowLeft, Loader2, Star,
  Camera, ThumbsUp, ThumbsDown, AlertTriangle, CreditCard, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import MomoPaymentModal from "@/components/shared/MomoPaymentModal";
import RatingModal from "@/components/shared/RatingModal";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus } = useOrders();
  
  const [paymentModal, setPaymentModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [inspectionModal, setInspectionModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [shopperJob, setShopperJob] = useState<any>(null);
  const [inspectionNotes, setInspectionNotes] = useState("");

  const order = orders.find(o => o.id === id);

  // Fetch shopper job for proof
  useEffect(() => {
    const fetchShopperJob = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("shopper_jobs")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();
      setShopperJob(data);
    };
    fetchShopperJob();
  }, [id]);

  // Payment gating logic
  const isPaymentAllowed = () => {
    if (!order) return false;
    const hasProof = shopperJob?.proof_url || order.pickup_photo_url;
    const allConfirmed = order.all_items_confirmed;
    const inspectionApproved = order.inspection_status === "approved";
    
    // Must have proof OR vendor confirmation, AND inspection must be approved
    return (hasProof || allConfirmed) && inspectionApproved;
  };

  const handleInspection = async (approved: boolean) => {
    if (!order) return;
    
    const { error } = await supabase
      .from("orders")
      .update({
        inspection_status: approved ? "approved" : "rejected",
        inspected_at: new Date().toISOString(),
        inspection_notes: inspectionNotes || null,
        status: approved ? "inspecting" : order.status,
      })
      .eq("id", order.id);

    if (error) {
      toast.error("Failed to update inspection status");
      return;
    }

    if (approved) {
      toast.success("Items approved! You can now proceed to payment.");
    } else {
      toast.info("Items rejected. Please contact support for substitution.");
    }
    
    setInspectionModal(false);
    setInspectionNotes("");
  };

  if (loading) {
    return (
      <DashboardLayout role="consumer" title="Order Status">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="consumer" title="Order Status">
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Order not found</h3>
          <Button onClick={() => navigate("/consumer/my-orders")}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderSteps = [
    { status: "pending", label: "Placed", icon: Clock },
    { status: "accepted", label: "Accepted", icon: CheckCircle2 },
    { status: "preparing", label: "Preparing", icon: Package },
    { status: "ready", label: "Ready", icon: Package },
    { status: "picked_up", label: "On Way", icon: Truck },
    { status: "inspecting", label: "Inspect", icon: Camera },
    { status: "completed", label: "Done", icon: CheckCircle2 },
  ];

  const currentStepIndex = orderSteps.findIndex(s => s.status === order.status);
  const proofUrl = shopperJob?.proof_url || order.pickup_photo_url;

  const handlePaymentSuccess = async () => {
    await updateOrderStatus(order.id, "completed");
    setPaymentModal(false);
    toast.success("Payment successful! Order completed.");
  };

  return (
    <DashboardLayout role="consumer" title="Order Status">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/consumer/my-orders")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold">{order.order_number}</h1>
            <StatusBadge status={order.status as any} />
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between relative">
              {orderSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                return (
                  <div key={step.status} className="flex flex-col items-center relative z-10">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: isCurrent ? 1.1 : 1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                    <span className={`text-[10px] mt-1 text-center ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
              {/* Progress Line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(currentStepIndex / (orderSteps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proof of Purchase */}
        {proofUrl && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4" /> Proof of Purchase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={proofUrl}
                alt="Proof of purchase"
                className="w-full max-h-48 object-cover rounded-xl"
              />
            </CardContent>
          </Card>
        )}

        {/* Inspection Section */}
        {proofUrl && order.inspection_status === "pending" && (
          <Card className="border-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-secondary">
                <AlertTriangle className="w-4 h-4" /> Inspection Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review the proof photo and confirm if items match your order.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setInspectionModal(true)}
                >
                  <ThumbsDown className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleInspection(true)}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspection Status */}
        {order.inspection_status === "approved" && (
          <Card className="border-success bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-success text-sm">Items Approved</p>
                <p className="text-xs text-muted-foreground">You can now pay</p>
              </div>
            </CardContent>
          </Card>
        )}

        {order.inspection_status === "rejected" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive text-sm">Items Rejected</p>
                <p className="text-xs text-muted-foreground">Contact support for substitution</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.quantity}x {item.product_name}</p>
                    {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                  <span className="font-bold text-sm">₵{Number(item.total_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₵{Number(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shopper Fee</span>
                  <span>₵{Number(order.shopper_fee || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₵{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {["picked_up", "ready"].includes(order.status) && (
            <Button onClick={() => setShowMap(true)}>
              <MapPin className="w-4 h-4 mr-2" /> Track Order
            </Button>
          )}
          
          {order.status !== "completed" && (
            <Button
              variant="hero"
              disabled={!isPaymentAllowed()}
              onClick={() => setPaymentModal(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isPaymentAllowed() ? "Pay Now" : "Payment Pending Approval"}
            </Button>
          )}

          {order.status === "completed" && (
            <Button variant="outline" onClick={() => setRatingModal(true)}>
              <Star className="w-4 h-4 mr-2" /> Rate Order
            </Button>
          )}

          {/* Report Problem Link */}
          <Link to={`/consumer/disputes/new?orderId=${order.id}`}>
            <Button variant="ghost" className="w-full text-muted-foreground">
              <Flag className="w-4 h-4 mr-2" /> Report a Problem
            </Button>
          </Link>
        </div>

        {/* Inspection Rejection Modal */}
        <Dialog open={inspectionModal} onOpenChange={setInspectionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Changes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What's wrong with the items?</Label>
                <Textarea
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Describe the issue..."
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleInspection(false)}
              >
                Submit & Request Substitution
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Map Dialog */}
        {showMap && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Track Your Order</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>Close</Button>
              </CardHeader>
              <CardContent>
                <OrderTrackingMap orderStatus={order.status} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Modal */}
        <MomoPaymentModal
          open={paymentModal}
          onClose={() => setPaymentModal(false)}
          orderId={order.id}
          amount={Number(order.total)}
          onSuccess={handlePaymentSuccess}
        />

        {/* Rating Modal */}
        <RatingModal
          open={ratingModal}
          onClose={() => setRatingModal(false)}
          orderId={order.id}
          targetUserId={order.shopper_id || order.vendor_id || ""}
          targetName="Service Provider"
          targetType="shopper"
        />
      </div>
    </DashboardLayout>
  );
};

export default OrderStatus;