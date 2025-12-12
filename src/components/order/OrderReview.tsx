import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  MapPin, 
  Trash2, 
  Plus, 
  Minus, 
  MessageSquare,
  Clock,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CartItem } from "./ItemRequestBuilder";
import { Database } from "@/integrations/supabase/types";

type Market = Database["public"]["Tables"]["markets"]["Row"];

interface OrderReviewProps {
  market: Market | null;
  cart: CartItem[];
  specialInstructions: string;
  onSpecialInstructionsChange: (value: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onPlaceOrder: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export const OrderReview = ({
  market,
  cart,
  specialInstructions,
  onSpecialInstructionsChange,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  onBack,
  loading,
}: OrderReviewProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shopperFee = subtotal * 0.1;
  const total = subtotal + shopperFee;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      await onPlaceOrder();
    } finally {
      setIsPlacingOrder(false);
      setShowConfirmDialog(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground mb-6">Add some items to place an order.</p>
        <Button onClick={onBack}>Go Back to Shopping</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold mb-2">Review Your Order</h2>
        <p className="text-muted-foreground">Confirm your items before placing the order</p>
      </div>

      {/* Market Info */}
      {market && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold">{market.name}</p>
              <p className="text-sm text-muted-foreground">{market.location}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cart Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Order Items ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.map((item, index) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  ₵{item.unitPrice.toFixed(2)} per {item.unit}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-right w-20">
                  <p className="font-bold">₵{(item.unitPrice * item.quantity).toFixed(2)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onRemoveItem(item.productId)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Special Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special requests? (e.g., 'Please pick ripe tomatoes', 'No bruised fruits')"
            value={specialInstructions}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₵{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shopper Fee (10%)</span>
            <span>₵{shopperFee.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">₵{total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Note */}
      <Card className="bg-secondary/10 border-secondary/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-secondary mb-1">Pay After Inspection</p>
            <p className="text-muted-foreground">
              You'll only pay once you've inspected and approved your items. No upfront payment required.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
          Back to Shopping
        </Button>
        <Button
          className="flex-1"
          onClick={() => setShowConfirmDialog(true)}
          disabled={loading || cart.length === 0}
        >
          Place Order
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Order</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to place an order for {cart.length} items totaling ₵{total.toFixed(2)}.
              A shopper will be assigned to collect your items from {market?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPlacingOrder}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlaceOrder} disabled={isPlacingOrder}>
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                "Confirm Order"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
