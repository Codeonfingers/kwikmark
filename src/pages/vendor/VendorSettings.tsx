import { useState, useEffect } from "react";
import { Store, MapPin, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useVendor } from "@/hooks/useVendor";
import { useMarkets } from "@/hooks/useMarkets";
import { toast } from "sonner";

const VendorSettings = () => {
  const { vendor, updateVendor, loading } = useVendor();
  const { markets } = useMarkets();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    business_name: "",
    stall_number: "",
    description: "",
    market_id: "",
    is_active: true,
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        business_name: vendor.business_name || "",
        stall_number: vendor.stall_number || "",
        description: vendor.description || "",
        market_id: vendor.market_id || "",
        is_active: vendor.is_active ?? true,
      });
    }
  }, [vendor]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateVendor({
      business_name: formData.business_name,
      stall_number: formData.stall_number || null,
      description: formData.description || null,
      market_id: formData.market_id || null,
      is_active: formData.is_active,
    });
    setSaving(false);

    if (!error) {
      toast.success("Settings saved!");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="vendor" title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="vendor" title="Settings">
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Vendor Settings</h1>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" /> Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                placeholder="Your business name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Tell customers about your business..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle off to hide your store temporarily
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Market</Label>
              <Select
                value={formData.market_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, market_id: value })
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

            <div className="space-y-2">
              <Label>Stall Number</Label>
              <Input
                value={formData.stall_number}
                onChange={(e) =>
                  setFormData({ ...formData, stall_number: e.target.value })
                }
                placeholder="e.g., A-15"
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Verification Status</p>
                <p className="text-sm text-muted-foreground">
                  {vendor?.is_verified
                    ? "Your account is verified"
                    : "Pending admin verification"}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  vendor?.is_verified
                    ? "bg-success/20 text-success"
                    : "bg-secondary/20 text-secondary"
                }`}
              >
                {vendor?.is_verified ? "Verified" : "Pending"}
              </div>
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

export default VendorSettings;
