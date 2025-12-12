import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Package, Clock, Eye, Filter, CreditCard, Star, MapPin, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderExportMenu from "@/components/shared/OrderExportMenu";
import { useOrders } from "@/hooks/useOrders";

const ConsumerOrders = () => {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  return (
    <DashboardLayout role="consumer" title="My Orders">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">My Orders</h1>
          <div className="flex gap-2">
            <Link to="/consumer/disputes/new">
              <Button variant="outline" size="sm">
                <AlertTriangle className="w-4 h-4 mr-1" /> Report Issue
              </Button>
            </Link>
            <OrderExportMenu orders={orders} />
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
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="inspecting">Inspecting</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No orders found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "all"
                ? "Start shopping to see your orders here"
                : `No ${statusFilter} orders`}
            </p>
            <Button onClick={() => navigate("/consumer/order/new")}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
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

                  <div className="space-y-2 mb-4">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.product_name}
                        </span>
                        <span className="font-medium">
                          ₵{Number(item.total_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{(order.items?.length || 0) - 3} more items
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <p className="font-display text-lg font-bold">
                      ₵{Number(order.total).toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/consumer/status/${order.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      {order.status === "inspecting" && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/consumer/status/${order.id}`)}
                        >
                          <CreditCard className="w-4 h-4 mr-1" /> Pay
                        </Button>
                      )}
                      {["ready", "picked_up"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/consumer/status/${order.id}`)}
                        >
                          <MapPin className="w-4 h-4 mr-1" /> Track
                        </Button>
                      )}
                      {order.status === "completed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/consumer/status/${order.id}`)}
                        >
                          <Star className="w-4 h-4 mr-1" /> Rate
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

export default ConsumerOrders;
