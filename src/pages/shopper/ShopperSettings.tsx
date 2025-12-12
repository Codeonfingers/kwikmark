import { useState, useEffect } from "react";
import { User, Phone, MapPin, CreditCard, Save, Loader2, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkets } from "@/hooks/useMarkets";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ShopperSettings = () => {
  const { user } = useAuth();
  const { markets } = useMarkets();
  const { 
    emailNotifications, pushNotifications, pushSupported, 
    enablePushNotifications, updatePreferences 
  } = useNotificationPreferences();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
  });

  const [shopper, setShopper] = useState({
    market_id: "",
    is_available: true,
    momo_phone: "",
    momo_network: "mtn",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [profileRes, shopperRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("shoppers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
        });
      }

      if (shopperRes.data) {
        setShopper({
          market_id: shopperRes.data.market_id || "",
          is_available: shopperRes.data.is_available ?? true,
          momo_phone: "",
          momo_network: "mtn",
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const [profileRes, shopperRes] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            full_name: profile.full_name,
            phone: profile.phone,
          })
          .eq("user_id", user.id),
        supabase
          .from("shoppers")
          .update({
            market_id: shopper.market_id || null,
            is_available: shopper.is_available,
          })
          .eq("user_id", user.id),
      ]);

      if (profileRes.error || shopperRes.error) {
        toast.error("Failed to save settings");
      } else {
        toast.success("Settings saved successfully!");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="shopper" title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="shopper" title="Settings">
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Settings</h1>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
                placeholder="024 XXX XXXX"
              />
            </div>
          </CardContent>
        </Card>

        {/* Shopper Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Shopper Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Market</Label>
              <Select
                value={shopper.market_id}
                onValueChange={(value) =>
                  setShopper({ ...shopper, market_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Available for Jobs</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle off when you're not working
                </p>
              </div>
              <Switch
                checked={shopper.is_available}
                onCheckedChange={(checked) =>
                  setShopper({ ...shopper, is_available: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new jobs
                </p>
              </div>
              <Switch
                checked={pushNotifications}
                disabled={!pushSupported}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enablePushNotifications();
                  } else {
                    updatePreferences(emailNotifications, false);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mobile Money Number</Label>
              <Input
                value={shopper.momo_phone}
                onChange={(e) =>
                  setShopper({ ...shopper, momo_phone: e.target.value })
                }
                placeholder="024 XXX XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <Select
                value={shopper.momo_network}
                onValueChange={(value) =>
                  setShopper({ ...shopper, momo_network: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                  <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default ShopperSettings;
