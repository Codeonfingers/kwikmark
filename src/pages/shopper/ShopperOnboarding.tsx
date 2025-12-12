import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ShopperOnboarding as ShopperOnboardingForm, ShopperOnboardingData } from "@/components/shopper/ShopperOnboarding";
import { useMarkets } from "@/hooks/useMarkets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ShopperOnboardingPage = () => {
  const navigate = useNavigate();
  const { user, addRole } = useAuth();
  const { markets, loading: marketsLoading } = useMarkets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async (data: ShopperOnboardingData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Update profile with Ghana Card details
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          phone: data.phone,
          ghana_card_number: data.ghanaCardNumber,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Create shopper profile
      const { error: shopperError } = await supabase
        .from("shoppers")
        .insert({
          user_id: user.id,
          market_id: data.primaryMarketId,
          is_available: true,
        });

      if (shopperError) throw shopperError;

      // Add shopper role
      await addRole("shopper");

      toast.success("Shopper profile created successfully!");
      navigate("/shopper");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (marketsLoading) {
    return (
      <DashboardLayout role="shopper" title="Shopper Onboarding">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ShopperOnboardingForm
      markets={markets}
      onComplete={handleComplete}
      loading={isSubmitting}
    />
  );
};

export default ShopperOnboardingPage;
