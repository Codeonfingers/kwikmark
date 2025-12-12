import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type ShopperJob = Database["public"]["Tables"]["shopper_jobs"]["Row"];

interface OrderEventConfig {
  role: "consumer" | "vendor" | "shopper" | "admin";
  userId?: string;
  vendorId?: string;
  shopperId?: string;
}

export const useOrderEvents = (config: OrderEventConfig) => {
  const { user } = useAuth();

  const handleOrderChange = useCallback(
    (payload: { eventType: string; new: Order; old: Order | null }) => {
      const { eventType, new: newOrder, old: oldOrder } = payload;
      const { role, userId, vendorId, shopperId } = config;

      // Consumer notifications
      if (role === "consumer" && newOrder.consumer_id === userId) {
        if (eventType === "UPDATE" && oldOrder) {
          if (oldOrder.status !== newOrder.status) {
            switch (newOrder.status) {
              case "accepted":
                toast.success("Your order has been accepted by the vendor!", {
                  description: `Order ${newOrder.order_number} is being prepared.`,
                });
                break;
              case "ready":
                toast.success("Your order is ready!", {
                  description: "The shopper will deliver it soon.",
                });
                break;
              case "picked_up":
                toast.info("Order picked up", {
                  description: "Your items are on the way!",
                });
                break;
              case "completed":
                toast.success("Order completed!", {
                  description: "Thank you for shopping with KwikMarket!",
                });
                break;
              case "disputed":
                toast.warning("Order disputed", {
                  description: "We'll review your dispute shortly.",
                });
                break;
            }
          }
          if (oldOrder.inspection_status !== newOrder.inspection_status) {
            if (newOrder.inspection_status === "approved") {
              toast.success("Inspection approved!", {
                description: "You can now complete the payment.",
              });
            }
          }
          if (!oldOrder.pickup_photo_url && newOrder.pickup_photo_url) {
            toast.info("Proof uploaded", {
              description: "The shopper has uploaded proof photos. Please inspect.",
            });
          }
        }
      }

      // Vendor notifications
      if (role === "vendor" && newOrder.vendor_id === vendorId) {
        if (eventType === "INSERT") {
          toast.success("New order received!", {
            description: `Order ${newOrder.order_number} needs your attention.`,
          });
        }
        if (eventType === "UPDATE" && oldOrder) {
          if (newOrder.inspection_status === "approved" && oldOrder.inspection_status !== "approved") {
            toast.success("Customer approved items!", {
              description: `Order ${newOrder.order_number} passed inspection.`,
            });
          }
          if (newOrder.status === "completed" && oldOrder.status !== "completed") {
            toast.success("Payment received!", {
              description: `Order ${newOrder.order_number} has been completed.`,
            });
          }
        }
      }

      // Admin notifications
      if (role === "admin") {
        if (eventType === "INSERT") {
          toast.info("New order created", {
            description: `Order ${newOrder.order_number}`,
          });
        }
        if (eventType === "UPDATE" && oldOrder && newOrder.status === "disputed") {
          toast.warning("Order disputed", {
            description: `Order ${newOrder.order_number} needs review.`,
          });
        }
      }
    },
    [config]
  );

  const handleJobChange = useCallback(
    (payload: { eventType: string; new: ShopperJob; old: ShopperJob | null }) => {
      const { eventType, new: newJob, old: oldJob } = payload;
      const { role, shopperId } = config;

      // Shopper notifications
      if (role === "shopper") {
        if (eventType === "INSERT" && newJob.status === "available") {
          toast.success("New job available!", {
            description: "A new delivery job is waiting for you.",
          });
        }
        if (eventType === "UPDATE" && oldJob && newJob.shopper_id === shopperId) {
          if (newJob.status === "completed" && oldJob.status !== "completed") {
            toast.success("Job completed!", {
              description: "Great work! Your earnings have been updated.",
            });
          }
        }
      }

      // Admin notifications
      if (role === "admin") {
        if (eventType === "UPDATE" && newJob.status === "completed") {
          toast.info("Job completed", {
            description: "A delivery job has been completed.",
          });
        }
      }
    },
    [config]
  );

  useEffect(() => {
    if (!user) return;

    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel(`order-events-${config.role}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          handleOrderChange({
            eventType: payload.eventType,
            new: payload.new as Order,
            old: payload.old as Order | null,
          });
        }
      )
      .subscribe();

    // Subscribe to shopper_jobs changes (for shoppers and admins)
    let jobsChannel: ReturnType<typeof supabase.channel> | null = null;
    if (config.role === "shopper" || config.role === "admin") {
      jobsChannel = supabase
        .channel(`job-events-${config.role}-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "shopper_jobs" },
          (payload) => {
            handleJobChange({
              eventType: payload.eventType,
              new: payload.new as ShopperJob,
              old: payload.old as ShopperJob | null,
            });
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(ordersChannel);
      if (jobsChannel) {
        supabase.removeChannel(jobsChannel);
      }
    };
  }, [user, config.role, handleOrderChange, handleJobChange]);
};

// Convenience hooks for specific roles
export const useConsumerOrderEvents = (consumerId?: string) => {
  useOrderEvents({ role: "consumer", userId: consumerId });
};

export const useVendorOrderEvents = (vendorId?: string) => {
  useOrderEvents({ role: "vendor", vendorId });
};

export const useShopperOrderEvents = (shopperId?: string) => {
  useOrderEvents({ role: "shopper", shopperId });
};

export const useAdminOrderEvents = () => {
  useOrderEvents({ role: "admin" });
};