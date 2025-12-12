import { useState, useEffect } from "react";
import { Star, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardCard from "@/components/shared/DashboardCard";
import { useShopperJobs } from "@/hooks/useShopperJobs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ShopperPerformance = () => {
  const { user } = useAuth();
  const { myJobs } = useShopperJobs();
  const [shopper, setShopper] = useState<any>(null);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: shopperData } = await supabase
        .from("shoppers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setShopper(shopperData);

      if (shopperData) {
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("*")
          .eq("to_user_id", user.id)
          .order("created_at", { ascending: false });

        setRatings(ratingsData || []);
      }
    };

    fetchData();
  }, [user]);

  const completedJobs = myJobs.filter(
    (j) => j.status === "completed" || j.status === "delivered"
  );
  const totalDeliveries = shopper?.total_deliveries || completedJobs.length;
  const averageRating = shopper?.rating || 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    stars: star,
    count: ratings.filter((r) => r.rating === star).length,
    percentage:
      ratings.length > 0
        ? (ratings.filter((r) => r.rating === star).length / ratings.length) * 100
        : 0,
  }));

  return (
    <DashboardLayout role="shopper" title="Performance">
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Your Performance</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DashboardCard
            title="Rating"
            value={averageRating.toFixed(1)}
            icon={Star}
            variant="gold"
          />
          <DashboardCard
            title="Total Deliveries"
            value={totalDeliveries}
            icon={CheckCircle2}
            variant="success"
          />
          <DashboardCard
            title="Reviews"
            value={ratings.length}
            icon={TrendingUp}
            variant="primary"
          />
          <DashboardCard
            title="Active Jobs"
            value={myJobs.filter((j) => !["completed", "delivered"].includes(j.status)).length}
            icon={Clock}
          />
        </div>

        {/* Rating Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratingDistribution.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-16">
                  <span className="font-medium">{stars}</span>
                  <Star className="w-4 h-4 fill-gold text-gold" />
                </div>
                <Progress value={percentage} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reviews yet
              </div>
            ) : (
              <div className="space-y-4">
                {ratings.slice(0, 10).map((rating) => (
                  <div key={rating.id} className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rating.rating
                              ? "fill-gold text-gold"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-2">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm">{rating.comment}</p>
                    )}
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

export default ShopperPerformance;
