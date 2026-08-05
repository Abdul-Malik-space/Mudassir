import React, { useEffect, useMemo, useState } from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  PackageCheck,
  ReceiptText,
  Users,
} from "lucide-react";

import { API_BASE_URL } from "../../config/api";

const numberFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 0,
});

const emptyStat = {
  value: 0,
  change: 0,
  trend: "up",
};

const emptyStats = {
  totalRevenue: { ...emptyStat },
  totalExpenses: { ...emptyStat },
  totalCustomers: { ...emptyStat },
  readyProducts: { ...emptyStat },
};

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(Number(value) || 0, minimum), maximum);

const getTrendDetails = (change, trend) => {
  const numericChange = Number(change || 0);

  if (numericChange === 0) {
    return {
      direction: "neutral",
      textClass: "text-slate-500 dark:text-slate-400",
      barWidth: 12,
    };
  }

  const isUp = trend !== "down";

  return {
    direction: isUp ? "up" : "down",
    textClass: isUp ? "text-emerald-600" : "text-rose-600",
    barWidth: clamp(Math.abs(numericChange) * 4, 12, 100),
  };
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

        const apiUrl = `${API_BASE_URL}/dashboard/stats`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const responseText = await response.text();

          console.error(
            "Dashboard stats returned a non-JSON response:",
            responseText.slice(0, 300)
          );

          throw new Error(
            "Dashboard statistics could not be loaded because the API returned an invalid response."
          );
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              result.message ||
              "Dashboard statistics could not be loaded."
          );
        }

        setStats({
          ...emptyStats,
          ...(result.data || {}),
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("StatsGrid error:", err);
          setError(
            err.message || "Dashboard statistics could not be loaded."
          );
          setStats(emptyStats);
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
        key: "revenue",
        title: "Total Revenue",
        value: currencyFormatter.format(
          Number(stats.totalRevenue?.value || 0)
        ),
        change: Number(stats.totalRevenue?.change || 0),
        trend: stats.totalRevenue?.trend || "up",
        icon: DollarSign,
        gradient: "from-emerald-500 to-teal-600",
      },
      {
        key: "expenses",
        title: "Total Expenses",
        value: currencyFormatter.format(
          Number(stats.totalExpenses?.value || 0)
        ),
        change: Number(stats.totalExpenses?.change || 0),
        trend: stats.totalExpenses?.trend || "up",
        icon: ReceiptText,
        gradient: "from-blue-500 to-indigo-600",
      },
      {
        key: "customers",
        title: "Total Customers",
        value: numberFormatter.format(
          Number(stats.totalCustomers?.value || 0)
        ),
        change: Number(stats.totalCustomers?.change || 0),
        trend: stats.totalCustomers?.trend || "up",
        icon: Users,
        gradient: "from-purple-500 to-pink-600",
      },
      {
        key: "ready-products",
        title: "Ready Products",
        value: numberFormatter.format(
          Number(stats.readyProducts?.value || 0)
        ),
        change: Number(stats.readyProducts?.change || 0),
        trend: stats.readyProducts?.trend || "up",
        icon: PackageCheck,
        gradient: "from-orange-500 to-red-600",
      },
    ],
    [stats]
  );

  return (
    <section aria-label="Dashboard statistics">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsData.map((item) => {
          const Icon = item.icon;
          const trendDetails = getTrendDetails(item.change, item.trend);
          const changeText = `${item.change > 0 ? "+" : ""}${Number(
            item.change || 0
          ).toFixed(1)}%`;

          return (
            <article
              key={item.key}
              className="group rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/30 dark:border-slate-700/60 dark:bg-slate-900/85 dark:hover:border-slate-600 dark:hover:shadow-slate-950/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {item.title}
                  </p>

                  {loading ? (
                    <div className="mb-4 h-9 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <p className="mb-4 truncate text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {trendDetails.direction === "up" && (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    )}

                    {trendDetails.direction === "down" && (
                      <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    )}

                    <span className={`font-bold ${trendDetails.textClass}`}>
                      {loading ? "..." : changeText}
                    </span>

                    <span className="text-slate-500 dark:text-slate-400">
                      compared with last month
                    </span>
                  </div>
                </div>

                <div
                  className={`shrink-0 rounded-xl bg-gradient-to-br p-3 text-white shadow-lg transition-transform duration-200 group-hover:scale-105 ${item.gradient}`}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${item.gradient}`}
                  style={{
                    width: loading ? "35%" : `${trendDetails.barWidth}%`,
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default StatsGrid;
