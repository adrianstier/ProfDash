import { LazyAnalyticsDashboard } from "@/components/analytics";

export const metadata = {
  title: "Analytics | ScholarOS",
  description: "View workspace productivity analytics and team performance",
};

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <LazyAnalyticsDashboard />
    </div>
  );
}
