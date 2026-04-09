"use client";

import { motion } from "framer-motion";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CalendarPreview } from "@/components/dashboard/CalendarPreview";
import { ConsistencyGraph } from "@/components/dashboard/ConsistencyGraph";
import { LastAssets } from "@/components/dashboard/LastAssets";

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function DashboardAnimatedView({ userName }: { userName?: string | null }) {
  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <GreetingBanner userName={userName ?? undefined} />
      </motion.div>

      <motion.section variants={itemVariants}>
        <StatsCards />
      </motion.section>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-8 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <CalendarPreview />
        </div>

        <div className="flex flex-col gap-8">
          <ConsistencyGraph />
          <LastAssets />
        </div>
      </motion.div>
    </motion.div>
  );
}
