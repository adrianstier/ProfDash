import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics | ScholarOS",
  description: "View workspace productivity analytics and team performance",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <AnalyticsDashboard />
    </div>
  );
}
