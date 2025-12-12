import { useState } from "react";
import { DollarSign, TrendingUp, ShoppingCart, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/shared/DashboardCard";
import { useOrders } from "@/hooks/useOrders";
import { useVendor } from "@/hooks/useVendor";

const VendorEarnings = () => {
  const { vendor } = useVendor();
  const { orders } = useOrders();
  const [period, setPeriod] = useState("week");

  const vendorOrders = orders.filter((o) => o.vendor_id === vendor?.id);
  const completedOrders = vendorOrders.filter((o) => o.status === "completed");

  const totalEarnings = completedOrders.reduce(
    (sum, o) => sum + Number(o.subtotal || 0),
    0
  );

  const filterByPeriod = (ordersList: typeof completedOrders) => {
    const now = new Date();
    return ordersList.filter((order) => {
      const orderDate = new Date(order.created_at);
      if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      } else if (period === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= monthAgo;
      }
      return true;
    });
  };

  const filteredOrders = filterByPeriod(completedOrders);
  const periodEarnings = filteredOrders.reduce(
    (sum, o) => sum + Number(o.subtotal || 0),
    0
  );

  return (
    <DashboardLayout role="vendor" title="Earnings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Your Earnings</h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Earnings"
            value={`₵${totalEarnings.toFixed(2)}`}
            icon={DollarSign}
            variant="success"
          />
          <DashboardCard
            title="Period Earnings"
            value={`₵${periodEarnings.toFixed(2)}`}
            icon={TrendingUp}
            variant="primary"
          />
          <DashboardCard
            title="Total Orders"
            value={completedOrders.length}
            icon={ShoppingCart}
          />
          <DashboardCard
            title="Avg Order Value"
            value={`₵${completedOrders.length > 0 ? (totalEarnings / completedOrders.length).toFixed(2) : "0.00"}`}
            icon={TrendingUp}
            variant="gold"
          />
        </div>

        {/* Earnings History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Earnings History</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed orders in this period
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items?.length || 0} items • {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-success">
                      +₵{Number(order.subtotal || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorEarnings;
