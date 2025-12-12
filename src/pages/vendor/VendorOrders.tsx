import { useState } from "react";
import { Package, Clock, CheckCircle2, X, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { useOrders } from "@/hooks/useOrders";
import { useVendor } from "@/hooks/useVendor";
import { toast } from "sonner";
import { OrderStatus } from "@/types";

const VendorOrders = () => {
  const { vendor } = useVendor();
  const { orders, updateOrderStatus, loading } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const vendorOrders = orders.filter((o) => o.vendor_id === vendor?.id);

  const filteredOrders =
    statusFilter === "all"
      ? vendorOrders
      : vendorOrders.filter((o) => o.status === statusFilter);

  const handleOrderAction = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    toast.success(`Order ${status}`);
  };

  const pendingCount = vendorOrders.filter((o) => o.status === "pending").length;
  const preparingCount = vendorOrders.filter((o) =>
    ["accepted", "preparing"].includes(o.status)
  ).length;

  return (
    <DashboardLayout role="vendor" title="Orders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Orders</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{preparingCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "all"
                ? "Orders will appear here when customers place them"
                : `No ${statusFilter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={order.status as any} />
                  </div>

                  <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium">
                          ₵{Number(item.total_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="mb-4 p-3 bg-secondary/10 rounded-lg">
                      <p className="text-sm font-medium">Special Instructions:</p>
                      <p className="text-sm text-muted-foreground">
                        {order.special_instructions}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="font-display text-lg font-bold">
                      ₵{Number(order.total).toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOrderAction(order.id, "cancelled")}
                          >
                            <X className="w-4 h-4 mr-1" /> Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOrderAction(order.id, "accepted")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                          </Button>
                        </>
                      )}
                      {order.status === "accepted" && (
                        <Button
                          size="sm"
                          onClick={() => handleOrderAction(order.id, "preparing")}
                        >
                          Start Preparing
                        </Button>
                      )}
                      {order.status === "preparing" && (
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => handleOrderAction(order.id, "ready")}
                        >
                          Mark Ready
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VendorOrders;
