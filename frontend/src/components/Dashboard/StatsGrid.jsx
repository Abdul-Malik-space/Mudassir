import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Eye,
  ShoppingCart,
  Users,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

const emptyStats = {
  totalRevenue: { value: 0, change: 0, trend: "up" },
  totalExpenses: { value: 0, change: 0, trend: "up" },
  totalCustomers: { value: 0, change: 0, trend: "up" },
  readyProducts: { value: 0, change: 0, trend: "up" },
};

function StatsGrid() {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadStats = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard/stats", {
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Dashboard data could not be loaded.");
        }

        setStats({ ...emptyStats, ...result.data });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("StatsGrid error:", err);
          setError(err.message || "Dashboard data could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => controller.abort();
  }, []);

  const statsData = useMemo(
    () => [
      {
        title: "Total Revenue",
        value: `Rs ${numberFormatter.format(stats.totalRevenue.value)}`,
        change: stats.totalRevenue.change,
        trend: stats.totalRevenue.trend,
        icon: DollarSign,
        color: "from-emerald-500 to-teal-600",
      },
      {
        title: "Total Expenses",
        value: `Rs ${numberFormatter.format(stats.totalExpenses.value)}`,
        change: stats.totalExpenses.change,
        trend: stats.totalExpenses.trend,
        icon: ShoppingCart,
        color: "from-blue-500 to-indigo-600",
      },
      {
        title: "Total Urwa Customers",
        value: numberFormatter.format(stats.totalCustomers.value),
        change: stats.totalCustomers.change,
        trend: stats.totalCustomers.trend,
        icon: Users,
        color: "from-purple-500 to-pink-600",
      },
      {
        title: "Urwa Ready Products",
        value: numberFormatter.format(stats.readyProducts.value),
        change: stats.readyProducts.change,
        trend: stats.readyProducts.trend,
        icon: Eye,
        color: "from-orange-500 to-red-600",
      },
    ],
    [stats]
  );

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsData.map((item) => {
          const Icon = item.icon;
          const isUp = item.trend !== "down";
          const changeText = `${item.change > 0 ? "+" : ""}${Number(
            item.change || 0
          ).toFixed(1)}%`;

          return (
            <div
              key={item.title}
              className="group rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/20 dark:border-slate-700/50 dark:bg-slate-900/80 dark:hover:shadow-slate-900/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.title}
                  </p>

                  <p className="mb-4 text-3xl font-bold text-slate-800 dark:text-white">
                    {loading ? "..." : item.value}
                  </p>

                  <div className="flex items-center space-x-2">
                    {isUp ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    )}

                    <span className={isUp ? "text-emerald-600" : "text-rose-600"}>
                      {loading ? "..." : changeText}
                    </span>

                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      vs last month
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-xl bg-gradient-to-br p-3 text-white transition-all duration-200 group-hover:scale-110 ${item.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full w-full rounded-full bg-gradient-to-r transition-all duration-1000 ${item.color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatsGrid;
