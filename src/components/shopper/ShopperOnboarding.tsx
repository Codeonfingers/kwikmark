import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  MapPin, 
  CreditCard, 
  Check, 
  ChevronRight,
  AlertCircle,
  Loader2,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Market = Database["public"]["Tables"]["markets"]["Row"];

interface ShopperOnboardingProps {
  markets: Market[];
  onComplete: (data: ShopperOnboardingData) => Promise<void>;
  loading?: boolean;
}

export interface ShopperOnboardingData {
  ghanaCardNumber: string;
  fullName: string;
  phone: string;
  selectedMarketIds: string[];
  primaryMarketId: string;
}

type Step = "profile" | "verification" | "markets";

const steps = [
  { id: "profile", label: "Personal Info", icon: User },
  { id: "verification", label: "Verification", icon: CreditCard },
  { id: "markets", label: "Market Areas", icon: MapPin },
] as const;

export const ShopperOnboarding = ({
  markets,
  onComplete,
  loading = false,
}: ShopperOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("profile");
  const [formData, setFormData] = useState<ShopperOnboardingData>({
    ghanaCardNumber: "",
    fullName: "",
    phone: "",
    selectedMarketIds: [],
    primaryMarketId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateGhanaCard = (cardNumber: string) => {
    // Ghana Card format: GHA-XXXXXXXXX-X
    const pattern = /^GHA-\d{9}-\d$/;
    return pattern.test(cardNumber.toUpperCase());
  };

  const validatePhone = (phone: string) => {
    // Ghana phone format: 0XX XXX XXXX or +233 XX XXX XXXX
    const pattern = /^(\+233|0)[235][0-9]{8}$/;
    return pattern.test(phone.replace(/\s/g, ""));
  };

  const handleNextStep = () => {
    if (currentStep === "profile") {
      if (!formData.fullName.trim()) {
        toast.error("Please enter your full name");
        return;
      }
      if (!formData.phone.trim() || !validatePhone(formData.phone)) {
        toast.error("Please enter a valid Ghanaian phone number");
        return;
      }
      setCurrentStep("verification");
    } else if (currentStep === "verification") {
      if (!formData.ghanaCardNumber.trim()) {
        toast.error("Please enter your Ghana Card number");
        return;
      }
      if (!validateGhanaCard(formData.ghanaCardNumber)) {
        toast.error("Please enter a valid Ghana Card number (GHA-XXXXXXXXX-X)");
        return;
      }
      setCurrentStep("markets");
    }
  };

  const handleMarketToggle = (marketId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedMarketIds.includes(marketId);
      let newSelectedIds: string[];
      let newPrimaryId = prev.primaryMarketId;

      if (isSelected) {
        newSelectedIds = prev.selectedMarketIds.filter((id) => id !== marketId);
        if (prev.primaryMarketId === marketId) {
          newPrimaryId = newSelectedIds[0] || "";
        }
      } else {
        newSelectedIds = [...prev.selectedMarketIds, marketId];
        if (!prev.primaryMarketId) {
          newPrimaryId = marketId;
        }
      }

      return {
        ...prev,
        selectedMarketIds: newSelectedIds,
        primaryMarketId: newPrimaryId,
      };
    });
  };

  const handleSubmit = async () => {
    if (formData.selectedMarketIds.length === 0) {
      toast.error("Please select at least one market area");
      return;
    }
    if (!formData.primaryMarketId) {
      toast.error("Please select a primary market");
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Become a Shopper</CardTitle>
            <p className="text-muted-foreground">
              Complete your profile to start earning with KwikMarket
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress */}
            <div>
              <Progress value={progress} className="h-2 mb-4" />
              <div className="flex justify-between">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div
                      key={step.id}
                      className={`flex flex-col items-center gap-1 ${
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                          ? "text-primary/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs font-medium">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            {currentStep === "profile" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g., 024 XXX XXXX"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your Ghanaian mobile number
                  </p>
                </div>
              </motion.div>
            )}

            {currentStep === "verification" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="ghanaCard">Ghana Card Number *</Label>
                  <Input
                    id="ghanaCard"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={formData.ghanaCardNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        ghanaCardNumber: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Ghana Card is required for identity verification
                  </p>
                </div>

                <div className="p-4 bg-secondary/10 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-secondary mb-1">Why we need this</p>
                      <p className="text-muted-foreground">
                        Your Ghana Card helps us verify your identity and ensures safety for
                        customers and vendors. Your information is securely stored and never shared.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === "markets" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Select Market Areas *</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose the markets where you'll be available to shop
                  </p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : markets.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No markets available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {markets.map((market) => {
                      const isSelected = formData.selectedMarketIds.includes(market.id);
                      const isPrimary = formData.primaryMarketId === market.id;

                      return (
                        <div
                          key={market.id}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleMarketToggle(market.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleMarketToggle(market.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{market.name}</p>
                                {isPrimary && (
                                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{market.location}</p>
                            </div>
                            {isSelected && !isPrimary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData((prev) => ({
                                    ...prev,
                                    primaryMarketId: market.id,
                                  }));
                                }}
                              >
                                Set Primary
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep !== "profile" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (currentStep === "verification") setCurrentStep("profile");
                    if (currentStep === "markets") setCurrentStep("verification");
                  }}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              {currentStep !== "markets" ? (
                <Button className="flex-1" onClick={handleNextStep}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting || formData.selectedMarketIds.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
