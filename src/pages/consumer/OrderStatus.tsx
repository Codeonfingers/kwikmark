import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  MapPin,
  ArrowLeft,
  Loader2,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderTrackingMap from "@/components/tracking/OrderTrackingMap";
import MomoPaymentModal from "@/components/shared/MomoPaymentModal";
import RatingModal from "@/components/shared/RatingModal";
import { useOrders } from "@/hooks/useOrders";

const OrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orders, loading, updateOrderStatus } = useOrders();
  
  const [paymentModal, setPaymentModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const order = orders.find(o => o.id === id);

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
          <Button onClick={() => navigate("/customer")}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderSteps = [
    { status: "pending", label: "Order Placed", icon: Clock },
    { status: "accepted", label: "Accepted", icon: CheckCircle2 },
    { status: "preparing", label: "Preparing", icon: Package },
    { status: "ready", label: "Ready", icon: Package },
    { status: "picked_up", label: "On the Way", icon: Truck },
    { status: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  const currentStepIndex = orderSteps.findIndex(s => s.status === order.status);

  const handleApproveOrder = async () => {
    await updateOrderStatus(order.id, "approved");
    setPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModal(false);
  };

  const handlePaymentClose = () => {
    setPaymentModal(false);
  };

  const handleRatingClose = () => {
    setRatingModal(false);
  };

  return (
    <DashboardLayout role="consumer" title="Order Status">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customer")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold">{order.order_number}</h1>
            <StatusBadge status={order.status as any} />
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
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
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                    <span className={`text-xs mt-2 text-center ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
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

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.quantity}x {item.product_name}</p>
                    {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                  </div>
                  <span className="font-bold">₵{Number(item.total_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>₵{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {["picked_up", "ready"].includes(order.status) && (
            <Button className="flex-1" onClick={() => setShowMap(true)}>
              <MapPin className="w-4 h-4 mr-2" /> Track Order
            </Button>
          )}
          
          {order.status === "inspecting" && (
            <Button className="flex-1" variant="hero" onClick={handleApproveOrder}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Pay
            </Button>
          )}

          {order.status === "completed" && (
            <Button className="flex-1" variant="outline" onClick={() => setRatingModal(true)}>
              <Star className="w-4 h-4 mr-2" /> Rate Order
            </Button>
          )}
        </div>

        {/* Map Dialog */}
        {showMap && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Track Your Order</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>Close</Button>
              </CardHeader>
              <CardContent>
                <OrderTrackingMap />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Modal */}
        <MomoPaymentModal
          open={paymentModal}
          onClose={handlePaymentClose}
          orderId={order.id}
          amount={Number(order.total)}
          onSuccess={handlePaymentSuccess}
        />

        {/* Rating Modal */}
        <RatingModal
          open={ratingModal}
          onClose={handleRatingClose}
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
