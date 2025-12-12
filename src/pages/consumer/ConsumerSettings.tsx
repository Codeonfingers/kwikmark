import { useState, useEffect } from "react";
import { User, Phone, MapPin, Shield, Plus, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleRequests } from "@/hooks/useRoleRequests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ConsumerSettings = () => {
  const { user, roles } = useAuth();
  const { myRequests, requestRole } = useRoleRequests();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"vendor" | "shopper">("vendor");
  const [roleReason, setRoleReason] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved!");
    }
  };

  const handleRequestRole = async () => {
    await requestRole(selectedRole, roleReason);
    setRoleModal(false);
    setRoleReason("");
  };

  const pendingRequests = myRequests.filter((r) => r.status === "pending");

  if (loading) {
    return (
      <DashboardLayout role="consumer" title="Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="consumer" title="Settings">
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Settings</h1>

        {/* Profile */}
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
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" /> Your Roles
            </CardTitle>
            <CardDescription>
              Request additional roles to access more features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))}
            </div>

            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pending Requests:</p>
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg"
                  >
                    <span className="capitalize">{req.requested_role}</span>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={roleModal} onOpenChange={setRoleModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Request Additional Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request New Role</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(v) => setSelectedRole(v as "vendor" | "shopper")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!roles.includes("vendor") && (
                          <SelectItem value="vendor">Vendor</SelectItem>
                        )}
                        {!roles.includes("shopper") && (
                          <SelectItem value="shopper">Shopper</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      value={roleReason}
                      onChange={(e) => setRoleReason(e.target.value)}
                      placeholder="Why do you want this role?"
                    />
                  </div>

                  <Button className="w-full" onClick={handleRequestRole}>
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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

export default ConsumerSettings;
