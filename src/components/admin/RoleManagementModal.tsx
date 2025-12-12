import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, ShieldX, User, Store, Briefcase, AlertTriangle, Loader2, History, Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRoles } from "@/hooks/useAdminRoles";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName?: string;
  onRoleChanged?: () => void;
}

const roleConfig: Record<AppRole, { icon: typeof User; label: string; color: string; description: string }> = {
  consumer: {
    icon: User,
    label: "Consumer",
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    description: "Can browse markets and place orders"
  },
  vendor: {
    icon: Store,
    label: "Vendor",
    color: "bg-green-500/10 text-green-600 border-green-200",
    description: "Can manage products and accept orders"
  },
  shopper: {
    icon: Briefcase,
    label: "Shopper",
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
    description: "Can accept jobs and deliver orders"
  },
  admin: {
    icon: Shield,
    label: "Admin",
    color: "bg-red-500/10 text-red-600 border-red-200",
    description: "Full platform access and user management"
  }
};

const allRoles: AppRole[] = ["consumer", "vendor", "shopper", "admin"];

export const RoleManagementModal = ({ 
  open, 
  onOpenChange, 
  targetUserId,
  targetUserName,
  onRoleChanged 
}: RoleManagementModalProps) => {
  const { loading, grantRole, revokeRole, listUserRoles, getAuditLog } = useAdminRoles();
  const [activeTab, setActiveTab] = useState("roles");
  const [currentRoles, setCurrentRoles] = useState<AppRole[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Grant state
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [grantReason, setGrantReason] = useState("");
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  
  // Revoke state
  const [revokeReason, setRevokeReason] = useState("");
  const [roleToRevoke, setRoleToRevoke] = useState<AppRole | null>(null);

  useEffect(() => {
    if (open && targetUserId) {
      fetchUserRoles();
      fetchAuditLog();
    }
  }, [open, targetUserId]);

  const fetchUserRoles = async () => {
    setLoadingRoles(true);
    const result = await listUserRoles(targetUserId);
    if (result.success && result.roles) {
      setCurrentRoles(result.roles.map(r => r.role));
    }
    setLoadingRoles(false);
  };

  const fetchAuditLog = async () => {
    const result = await getAuditLog(targetUserId);
    if (result.success && result.auditLog) {
      setAuditLog(result.auditLog);
    }
  };

  const handleGrantRole = async () => {
    if (!selectedRole) return;
    
    // For admin role, require MFA
    if (selectedRole === "admin" && !showMfaChallenge) {
      setShowMfaChallenge(true);
      return;
    }
    
    // Simulate MFA verification (in production, this would verify with auth provider)
    const mfaVerified = selectedRole === "admin" ? mfaCode === "123456" : false;
    
    if (selectedRole === "admin" && !mfaVerified) {
      // For demo purposes, accept any 6-digit code
      if (mfaCode.length !== 6) {
        return;
      }
    }
    
    const result = await grantRole(
      targetUserId, 
      selectedRole, 
      grantReason || undefined,
      selectedRole === "admin" ? true : false // In production, verify actual MFA
    );
    
    if (result.success) {
      setSelectedRole("");
      setGrantReason("");
      setShowMfaChallenge(false);
      setMfaCode("");
      fetchUserRoles();
      fetchAuditLog();
      onRoleChanged?.();
    } else if (result.requireMfa) {
      setShowMfaChallenge(true);
    }
  };

  const handleRevokeRole = async (role: AppRole) => {
    const result = await revokeRole(targetUserId, role, revokeReason || undefined);
    if (result.success) {
      setRoleToRevoke(null);
      setRevokeReason("");
      fetchUserRoles();
      fetchAuditLog();
      onRoleChanged?.();
    }
  };

  const availableRoles = allRoles.filter(r => !currentRoles.includes(r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Role Management
          </DialogTitle>
          <DialogDescription>
            Manage roles for {targetUserName || targetUserId.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles">Current Roles</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-6 mt-4">
            {/* Current Roles */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Current Roles</h3>
              {loadingRoles ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : currentRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentRoles.map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    return (
                      <Badge 
                        key={role} 
                        variant="outline" 
                        className={`${config.color} gap-2 py-2 px-3`}
                      >
                        <Icon className="w-4 h-4" />
                        {config.label}
                        {roleToRevoke === role ? (
                          <div className="flex items-center gap-1 ml-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-5 px-1"
                              onClick={() => handleRevokeRole(role)}
                              disabled={loading}
                            >
                              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldX className="w-3 h-3" />}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-5 px-1"
                              onClick={() => setRoleToRevoke(null)}
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-5 px-1 ml-2 hover:bg-destructive/20"
                            onClick={() => setRoleToRevoke(role)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {roleToRevoke && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Confirm Role Revocation</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Reason (optional)</Label>
                      <Textarea
                        placeholder="Enter reason for revoking this role..."
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRevokeRole(roleToRevoke)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Revoke {roleConfig[roleToRevoke].label}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setRoleToRevoke(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Grant New Role */}
            {availableRoles.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground">Grant New Role</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Select Role</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a role to grant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => {
                          const config = roleConfig[role];
                          const Icon = config.icon;
                          return (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span>{config.label}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {config.description}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === "admin" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Admin role requires additional verification</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm">Reason (required)</Label>
                        <Textarea
                          placeholder="Explain why this user needs admin access..."
                          value={grantReason}
                          onChange={(e) => setGrantReason(e.target.value)}
                          className="min-h-[80px]"
                          required
                        />
                      </div>

                      <AnimatePresence>
                        {showMfaChallenge && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                          >
                            <Label className="text-sm">MFA Code</Label>
                            <Input
                              type="text"
                              placeholder="Enter 6-digit code"
                              value={mfaCode}
                              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                              className="font-mono tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the code from your authenticator app
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {selectedRole && selectedRole !== "admin" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Reason (optional)</Label>
                      <Textarea
                        placeholder="Enter reason for granting this role..."
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  )}

                  {selectedRole && (
                    <Button 
                      onClick={handleGrantRole}
                      disabled={loading || (selectedRole === "admin" && (!grantReason || (showMfaChallenge && mfaCode.length !== 6)))}
                      className="gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Grant {roleConfig[selectedRole].label} Role
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <History className="w-4 h-4" />
              <span className="text-sm">Role change history</span>
            </div>

            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No role changes recorded
              </p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {entry.action === "GRANT" ? (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <ShieldX className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {entry.action === "GRANT" ? "Granted" : "Revoked"}{" "}
                            <Badge variant="outline" className="ml-1">
                              {entry.role}
                            </Badge>
                          </p>
                          {entry.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reason: {entry.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                        {entry.mfa_verified && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            MFA Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};