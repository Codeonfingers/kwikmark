import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/shared/DashboardCard";
import { useShopperJobs } from "@/hooks/useShopperJobs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ShopperEarnings = () => {
  const { user } = useAuth();
  const { myJobs } = useShopperJobs();
  const [period, setPeriod] = useState("week");
  const [shopper, setShopper] = useState<any>(null);

  useEffect(() => {
    const fetchShopper = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("shoppers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setShopper(data);
    };
    fetchShopper();
  }, [user]);

  const completedJobs = myJobs.filter(
    (j) => j.status === "completed" || j.status === "delivered"
  );

  const totalEarnings = completedJobs.reduce(
    (sum, j) => sum + Number(j.commission_amount || 0),
    0
  );

  const filterJobsByPeriod = (jobs: typeof completedJobs) => {
    const now = new Date();
    return jobs.filter((job) => {
      const jobDate = new Date(job.delivered_at || job.created_at);
      if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return jobDate >= weekAgo;
      } else if (period === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return jobDate >= monthAgo;
      }
      return true;
    });
  };

  const filteredJobs = filterJobsByPeriod(completedJobs);
  const periodEarnings = filteredJobs.reduce(
    (sum, j) => sum + Number(j.commission_amount || 0),
    0
  );

  return (
    <DashboardLayout role="shopper" title="Earnings">
      <div className="space-y-6">
        {/* Period Selector */}
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
            title="Completed Jobs"
            value={completedJobs.length}
            icon={Calendar}
          />
          <DashboardCard
            title="Commission Rate"
            value={`${shopper?.commission_rate || 10}%`}
            icon={DollarSign}
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
            {filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed jobs in this period
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">
                        Order #{job.order?.order_number || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          job.delivered_at || job.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-display text-lg font-bold text-success">
                      +₵{Number(job.commission_amount || 0).toFixed(2)}
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

export default ShopperEarnings;
