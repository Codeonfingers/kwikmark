import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Check, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type Market = Database["public"]["Tables"]["markets"]["Row"];

interface MarketSelectorProps {
  markets: Market[];
  loading: boolean;
  selectedMarketId: string | null;
  onSelectMarket: (marketId: string) => void;
  onContinue: () => void;
}

export const MarketSelector = ({
  markets,
  loading,
  selectedMarketId,
  onSelectMarket,
  onContinue,
}: MarketSelectorProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold mb-2">No markets available</h3>
        <p className="text-muted-foreground">Check back soon for market listings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl font-bold mb-2">Choose Your Market</h2>
        <p className="text-muted-foreground">Select where you'd like to shop from</p>
      </div>

      <div className="grid gap-4">
        {markets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedMarketId === market.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:shadow-lg"
              }`}
              onClick={() => onSelectMarket(market.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">{market.name}</h3>
                      {market.is_active && (
                        <Badge variant="outline" className="text-xs">Open</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{market.location}</p>
                    {market.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {market.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {selectedMarketId === market.id ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!selectedMarketId}
        onClick={onContinue}
      >
        Continue to Shopping
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};
