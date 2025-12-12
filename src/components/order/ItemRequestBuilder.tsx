import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingBag, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CategoryPill from "@/components/shared/CategoryPill";
import { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  vendorId: string;
}

interface ItemRequestBuilderProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  loading: boolean;
}

export const ItemRequestBuilder = ({
  products,
  categories,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  loading,
}: ItemRequestBuilderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory && product.is_available;
  });

  const getCartItem = (productId: string) => cart.find((item) => item.productId === productId);

  const handleAddProduct = (product: Product) => {
    const existingItem = getCartItem(product.id);
    if (existingItem) {
      onUpdateQuantity(product.id, existingItem.quantity + 1);
    } else {
      onAddToCart({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.price),
        unit: product.unit || "piece",
        vendorId: product.vendor_id,
      });
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <CategoryPill
          icon="🛒"
          name="All"
          count={products.length}
          isActive={!selectedCategory}
          onClick={() => setSelectedCategory(null)}
        />
        {categories.map((category) => (
          <CategoryPill
            key={category.id}
            icon={category.icon || "📦"}
            name={category.name}
            count={products.filter((p) => p.category_id === category.id).length}
            isActive={selectedCategory === category.id}
            onClick={() => setSelectedCategory(category.id)}
          />
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product, index) => {
            const cartItem = getCartItem(product.id);
            const category = categories.find((c) => c.id === product.category_id);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="aspect-square bg-muted relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                    {category && (
                      <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                        {category.icon} {category.name}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      per {product.unit || "piece"}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-bold text-primary">
                        ₵{Number(product.price).toFixed(2)}
                      </span>
                      {cartItem ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() =>
                              onUpdateQuantity(product.id, Math.max(0, cartItem.quantity - 1))
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-medium text-sm">
                            {cartItem.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(product.id, cartItem.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAddProduct(product)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Cart Summary */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
          >
            <Card className="shadow-xl border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{cartCount} items</p>
                      <p className="text-sm text-muted-foreground">in your cart</p>
                    </div>
                  </div>
                  <p className="font-display text-2xl font-bold text-primary">
                    ₵{cartTotal.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
