import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, Package, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useMarkets } from "@/hooks/useMarkets";

const ConsumerMarket = () => {
  const { markets, loading } = useMarkets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarkets = markets.filter(market =>
    market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="consumer" title="Select Market">
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Choose Your Market</h1>
          <p className="text-muted-foreground">Select a market to start shopping</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold mb-2">No markets found</h3>
            <p className="text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market, index) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/customer/order/new?market=${market.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        {market.is_active && (
                          <Badge variant="secondary" className="bg-success/20 text-success">
                            Open
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold mb-1">{market.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{market.location}</p>
                      {market.description && (
                        <p className="text-sm text-muted-foreground/80 line-clamp-2">{market.description}</p>
                      )}
                      <Button variant="ghost" className="w-full mt-4" size="sm">
                        Shop Here <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConsumerMarket;
