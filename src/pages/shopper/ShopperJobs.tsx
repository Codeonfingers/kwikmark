import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Package,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useShopperJobs } from "@/hooks/useShopperJobs";
import { toast } from "sonner";

const ShopperJobs = () => {
  const { availableJobs, myJobs, loading, acceptJob, completeJob } = useShopperJobs();
  const [processingJob, setProcessingJob] = useState<string | null>(null);

  const handleAcceptJob = async (jobId: string) => {
    setProcessingJob(jobId);
    const result = await acceptJob(jobId);
    setProcessingJob(null);
    if (!result.error) {
      toast.success("Job accepted!");
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    setProcessingJob(jobId);
    const result = await completeJob(jobId);
    setProcessingJob(null);
    if (!result.error) {
      toast.success("Job completed!");
    }
  };

  const activeJobs = myJobs.filter(j => !["completed", "delivered"].includes(j.status));
  const completedJobs = myJobs.filter(j => ["completed", "delivered"].includes(j.status));

  if (loading) {
    return (
      <DashboardLayout role="shopper" title="Jobs">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="shopper" title="Jobs">
      <div className="space-y-6">
        <Tabs defaultValue="available">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available" className="relative">
              Available
              {availableJobs.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {availableJobs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {/* Available Jobs */}
          <TabsContent value="available" className="space-y-4 mt-4">
            {availableJobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold mb-2">No available jobs</h3>
                  <p className="text-muted-foreground">Check back soon for new shopping opportunities</p>
                </CardContent>
              </Card>
            ) : (
              availableJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg">Order #{job.order?.order_number}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(job.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">New</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span>Order ready</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>Makola Market</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => handleAcceptJob(job.id)}
                        disabled={processingJob === job.id}
                      >
                        {processingJob === job.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Accept Job
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Active Jobs */}
          <TabsContent value="active" className="space-y-4 mt-4">
            {activeJobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold mb-2">No active jobs</h3>
                  <p className="text-muted-foreground">Accept a job to get started</p>
                </CardContent>
              </Card>
            ) : (
              activeJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">Order #{job.order?.order_number}</p>
                        <Badge className="mt-1">{job.status}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">₵{Number(job.commission_amount || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Commission</p>
                      </div>
                    </div>

                    {job.status === "accepted" && (
                      <Button 
                        className="w-full" 
                        variant="hero"
                        onClick={() => handleCompleteJob(job.id)}
                        disabled={processingJob === job.id}
                      >
                        {processingJob === job.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Mark Complete
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Completed Jobs */}
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedJobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold mb-2">No completed jobs yet</h3>
                  <p className="text-muted-foreground">Complete jobs to see them here</p>
                </CardContent>
              </Card>
            ) : (
              completedJobs.map((job) => (
                <Card key={job.id} className="opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Order #{job.order?.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.delivered_at || job.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">₵{Number(job.commission_amount || 0).toFixed(2)}</p>
                        <Badge variant="outline" className="bg-success/10 text-success">Completed</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ShopperJobs;
