"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
export default function AnalyticsPage() {
    return (<PageTransition>
      <PageLayout header="Analytics & Reporting" description="Analytics have been merged into the Dashboard. Redirecting...">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <p className="text-muted-foreground mb-2">
            Analytics are now integrated into the Admin Dashboard.
          </p>
          <motion.a href="/admin/dashboard" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Go to Dashboard
          </motion.a>
        </motion.div>
      </PageLayout>
    </PageTransition>);
}
