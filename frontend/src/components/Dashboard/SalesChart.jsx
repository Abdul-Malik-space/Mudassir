import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const formatCurrency = (value) => {
  return `Rs ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
};

function SalesChart() {
  const currentYear = new Date().getFullYear();

  const [data, setData] = useState([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadSalesChart = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/dashboard/sales-chart?year=${currentYear}`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Sales chart data could not be loaded."
          );
        }

        const formattedData = Array.isArray(result.data)
          ? result.data.map((item, index) => ({
              name: item.name || "Uncategorized",
              amount: Number(item.amount || 0),
              quantity: Number(item.quantity || 0),
              salesCount: Number(item.salesCount || 0),
              percentage: Number(item.percentage || 0),
              color: COLORS[index % COLORS.length],
            }))
          : [];

        setData(formattedData);
        setTotalSalesAmount(Number(result.totalSalesAmount || 0));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Sales chart load error:", error);

          setError(
            error.message || "Sales chart data could not be loaded."
          );

          setData([]);
          setTotalSalesAmount(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSalesChart();

    return () => {
      controller.abort();
    };
  }, [currentYear]);

  const hasData = data.some((item) => item.amount > 0);

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-b-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Sales by Category
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sales distribution for {currentYear}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="relative h-48">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/80">
            <span className="text-sm text-slate-500">
              Loading sales chart...
            </span>
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-center text-sm text-slate-500">
              No sales data found for {currentYear}.
            </span>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={5}
              dataKey="amount"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value, name, item) => {
                const percentage =
                  item?.payload?.percentage || 0;

                return [
                  `${formatCurrency(value)} (${percentage}%)`,
                  name,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {!loading && hasData && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total Sales
            </span>

            <span className="text-sm font-bold text-slate-800 dark:text-white">
              {formatCurrency(totalSalesAmount)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {data.map((item, index) => (
          <div
            className="flex items-center justify-between"
            key={`${item.name}-${index}`}
          >
            <div className="flex min-w-0 items-center space-x-3">
              <div
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: item.color,
                }}
              />

              <span className="truncate text-sm text-slate-600 dark:text-slate-400">
                {item.name}
              </span>
            </div>

            <div className="ml-3 text-right">
              <span className="block text-sm font-medium text-slate-800 dark:text-white">
                {item.percentage}%
              </span>

              <span className="block text-xs text-slate-400">
                {formatCurrency(item.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SalesChart;