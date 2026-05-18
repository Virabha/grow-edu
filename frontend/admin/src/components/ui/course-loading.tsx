"use client";
import { motion } from "framer-motion";
import { PageLayout } from "@/components/layout/page-layout";
import { BookOpen, Edit3, BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
interface CourseLoadingProps {
    type?: "edit" | "analytics" | "view";
    title?: string;
}
const loadingVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut" as const,
        },
    },
};
const iconMap = {
    edit: Edit3,
    analytics: BarChart3,
    view: BookOpen,
};
const titleMap = {
    edit: "Loading Course Editor",
    analytics: "Loading Analytics",
    view: "Loading Course",
};
const subtitleMap = {
    edit: "Preparing your course for editing...",
    analytics: "Gathering performance metrics...",
    view: "Fetching course details...",
};
export function CourseLoading({ type = "view", title }: CourseLoadingProps) {
    const Icon = iconMap[type];
    const defaultTitle = titleMap[type];
    const subtitle = subtitleMap[type];
    return (<PageLayout header={title || defaultTitle} subtitle={subtitle}>
      <motion.div variants={loadingVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card className="border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 15,
        }} className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"/>
                <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                  <Icon className="h-12 w-12 text-primary"/>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/>
                <span className="text-sm font-medium">Please wait...</span>
              </motion.div>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2"/>
              <Skeleton className="h-4 w-24"/>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-5/6"/>
              <Skeleton className="h-4 w-4/6"/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2"/>
              <Skeleton className="h-4 w-24"/>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full"/>
              <Skeleton className="h-4 w-5/6"/>
              <Skeleton className="h-4 w-4/6"/>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2"/>
              <Skeleton className="h-4 w-32"/>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg"/>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full"/>
                <Skeleton className="h-10 w-full"/>
              </div>
              <Skeleton className="h-32 w-full rounded-lg"/>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageLayout>);
}
