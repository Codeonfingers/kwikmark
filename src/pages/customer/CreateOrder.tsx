import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, MapPin, ShoppingBag, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MarketSelector } from "@/components/order/MarketSelector";
import { ItemRequestBuilder, CartItem } from "@/components/order/ItemRequestBuilder";
import { OrderReview } from "@/components/order/OrderReview";
import { useMarkets } from "@/hooks/useMarkets";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { toast } from "sonner";

type Step = "market" | "items" | "review";

const steps: { id: Step; label: string; icon: React.ComponentType<any> }[] = [
  { id: "market", label: "Select Market", icon: MapPin },
  { id: "items", label: "Add Items", icon: ShoppingBag },
  { id: "review", label: "Review Order", icon: ClipboardList },
];

const CreateOrder = () => {
  const navigate = useNavigate();
  const { markets, loading: marketsLoading } = useMarkets();
  const { products, categories, loading: productsLoading } = useProducts();
  const { createOrder } = useOrders();

  const [currentStep, setCurrentStep] = useState<Step>("market");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const selectedMarket = markets.find((m) => m.id === selectedMarketId) || null;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    toast.success(`Added ${item.productName} to cart`);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    const item = cart.find((i) => i.productId === productId);
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    if (item) {
      toast.info(`Removed ${item.productName} from cart`);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedMarketId || cart.length === 0) return;

    // Get vendor ID from first product (simplified - in production, handle multi-vendor)
    const vendorId = cart[0]?.vendorId;
    if (!vendorId) {
      toast.error("Unable to determine vendor");
      return;
    }

    const orderItems = cart.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    const { error } = await createOrder(
      vendorId,
      selectedMarketId,
      orderItems,
      specialInstructions || undefined
    );

    if (!error) {
      navigate("/customer");
    }
  };

  const goToStep = (step: Step) => {
    if (step === "items" && !selectedMarketId) {
      toast.error("Please select a market first");
      return;
    }
    if (step === "review" && cart.length === 0) {
      toast.error("Please add items to your cart first");
      return;
    }
    setCurrentStep(step);
  };

  return (
    <DashboardLayout role="consumer" title="Create Order">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (currentStep === "market") {
                navigate("/customer");
              } else if (currentStep === "items") {
                setCurrentStep("market");
              } else {
                setCurrentStep("items");
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">New Order</h1>
            <p className="text-sm text-muted-foreground">
              {steps[currentStepIndex].label}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <button
                  key={step.id}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                      ? "text-primary/70 cursor-pointer"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => isCompleted && goToStep(step.id)}
                  disabled={!isCompleted && !isCurrent}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden md:block">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === "market" && (
              <MarketSelector
                markets={markets}
                loading={marketsLoading}
                selectedMarketId={selectedMarketId}
                onSelectMarket={setSelectedMarketId}
                onContinue={() => goToStep("items")}
              />
            )}

            {currentStep === "items" && (
              <div className="space-y-6">
                <ItemRequestBuilder
                  products={products}
                  categories={categories}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  loading={productsLoading}
                />
                
                {cart.length > 0 && (
                  <div className="pb-24 md:pb-6">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => goToStep("review")}
                    >
                      Continue to Review ({cart.length} items)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentStep === "review" && (
              <OrderReview
                market={selectedMarket}
                cart={cart}
                specialInstructions={specialInstructions}
                onSpecialInstructionsChange={setSpecialInstructions}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onPlaceOrder={handlePlaceOrder}
                onBack={() => goToStep("items")}
                loading={false}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default CreateOrder;
