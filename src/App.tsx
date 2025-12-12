import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleRedirect from "@/components/auth/RoleRedirect";
import Index from "./pages/Index";
import Markets from "./pages/Markets";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";
import Subscriptions from "./pages/Subscriptions";
import ProfileSettings from "./pages/ProfileSettings";

// Consumer pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CreateOrder from "./pages/customer/CreateOrder";
import ConsumerMarket from "./pages/consumer/ConsumerMarket";
import ConsumerOrders from "./pages/consumer/ConsumerOrders";
import ConsumerSettings from "./pages/consumer/ConsumerSettings";
import OrderStatus from "./pages/consumer/OrderStatus";

// Vendor pages
import VendorDashboardNew from "./pages/vendor/VendorDashboardNew";
import VendorOnboarding from "./pages/vendor/VendorOnboarding";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorCatalog from "./pages/vendor/VendorCatalog";
import VendorEarnings from "./pages/vendor/VendorEarnings";
import VendorSettings from "./pages/vendor/VendorSettings";

// Shopper pages
import ShopperDashboardNew from "./pages/shopper/ShopperDashboardNew";
import ShopperOnboarding from "./pages/shopper/ShopperOnboarding";
import ShopperJobs from "./pages/shopper/ShopperJobs";
import ShopperJobDetail from "./pages/shopper/ShopperJobDetail";
import ShopperEarnings from "./pages/shopper/ShopperEarnings";
import ShopperPerformance from "./pages/shopper/ShopperPerformance";
import ShopperSettings from "./pages/shopper/ShopperSettings";

// Admin pages
import AdminDashboardNew from "./pages/admin/AdminDashboardNew";
import AdminRoleRequests from "./pages/admin/AdminRoleRequests";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminShoppers from "./pages/admin/AdminShoppers";
import AdminMarkets from "./pages/admin/AdminMarkets";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/markets/:id" element={<Markets />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Smart redirect for authenticated users */}
            <Route path="/dashboard" element={<RoleRedirect />} />
            
            {/* Profile settings - any authenticated user */}
            <Route path="/profile" element={<ProfileSettings />} />
            
            {/* Consumer/Customer routes */}
            <Route path="/consumer" element={
              <ProtectedRoute requiredRole="consumer">
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/consumer/market" element={
              <ProtectedRoute requiredRole="consumer">
                <ConsumerMarket />
              </ProtectedRoute>
            } />
            <Route path="/consumer/my-orders" element={
              <ProtectedRoute requiredRole="consumer">
                <ConsumerOrders />
              </ProtectedRoute>
            } />
            <Route path="/consumer/settings" element={
              <ProtectedRoute requiredRole="consumer">
                <ConsumerSettings />
              </ProtectedRoute>
            } />
            <Route path="/consumer/order/new" element={
              <ProtectedRoute requiredRole="consumer">
                <CreateOrder />
              </ProtectedRoute>
            } />
            <Route path="/consumer/status/:id" element={
              <ProtectedRoute requiredRole="consumer">
                <OrderStatus />
              </ProtectedRoute>
            } />
            <Route path="/customer" element={
              <ProtectedRoute requiredRole="consumer">
                <CustomerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer/order/new" element={
              <ProtectedRoute requiredRole="consumer">
                <CreateOrder />
              </ProtectedRoute>
            } />
            
            {/* Vendor routes */}
            <Route path="/vendor" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/vendor/dashboard" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/vendor/onboarding" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/vendor/orders" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorOrders />
              </ProtectedRoute>
            } />
            <Route path="/vendor/catalog" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorCatalog />
              </ProtectedRoute>
            } />
            <Route path="/vendor/earnings" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorEarnings />
              </ProtectedRoute>
            } />
            <Route path="/vendor/settings" element={
              <ProtectedRoute requiredRole="vendor">
                <VendorSettings />
              </ProtectedRoute>
            } />
            
            {/* Shopper routes */}
            <Route path="/shopper" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/shopper/dashboard" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/shopper/onboarding" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/shopper/jobs" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperJobs />
              </ProtectedRoute>
            } />
            <Route path="/shopper/jobs/:jobId" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperJobDetail />
              </ProtectedRoute>
            } />
            <Route path="/shopper/earnings" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperEarnings />
              </ProtectedRoute>
            } />
            <Route path="/shopper/performance" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperPerformance />
              </ProtectedRoute>
            } />
            <Route path="/shopper/settings" element={
              <ProtectedRoute requiredRole="shopper">
                <ShopperSettings />
              </ProtectedRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboardNew />
              </ProtectedRoute>
            } />
            <Route path="/admin/role-requests" element={
              <ProtectedRoute requiredRole="admin">
                <AdminRoleRequests />
              </ProtectedRoute>
            } />
            <Route path="/admin/vendors" element={
              <ProtectedRoute requiredRole="admin">
                <AdminVendors />
              </ProtectedRoute>
            } />
            <Route path="/admin/shoppers" element={
              <ProtectedRoute requiredRole="admin">
                <AdminShoppers />
              </ProtectedRoute>
            } />
            <Route path="/admin/markets" element={
              <ProtectedRoute requiredRole="admin">
                <AdminMarkets />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;