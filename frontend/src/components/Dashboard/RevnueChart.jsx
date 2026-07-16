import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const EMPTY_DATA = MONTHS.map(
  (month, index) => ({
    month,
    monthNumber: index + 1,
    revenue: 0,
    expenses: 0,
    profit: 0,
  })
);

const formatCurrency = (value) => {
  return `Rs ${Number(value || 0).toLocaleString(
    "en-PK",
    {
      maximumFractionDigits: 0,
    }
  )}`;
};

const formatYAxisValue = (value) => {
  const amount = Number(value || 0);

  if (Math.abs(amount) >= 10000000) {
    return `Rs ${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `Rs ${(amount / 100000).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `Rs ${(amount / 1000).toFixed(0)}k`;
  }

  return `Rs ${amount}`;
};

function RevenueChart() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] =
    useState(currentYear);

  const [selectedMetric, setSelectedMetric] =
    useState("both");

  const [data, setData] = useState(EMPTY_DATA);

  const [totals, setTotals] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showAll, setShowAll] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Revenue chart API
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller = new AbortController();

    const fetchRevenueChart = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/dashboard/revenue-chart?year=${selectedYear}`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Revenue chart data could not be loaded."
          );
        }

        const formattedData = Array.isArray(
          result.data
        )
          ? result.data.map((record) => {
              const revenue = Number(
                record.revenue || 0
              );

              const expenses = Number(
                record.expenses || 0
              );

              return {
                ...record,
                revenue,
                expenses,

                profit:
                  record.profit !== undefined
                    ? Number(record.profit || 0)
                    : revenue - expenses,
              };
            })
          : EMPTY_DATA;

        setData(formattedData);

        const calculatedRevenue =
          formattedData.reduce(
            (total, record) =>
              total +
              Number(record.revenue || 0),
            0
          );

        const calculatedExpenses =
          formattedData.reduce(
            (total, record) =>
              total +
              Number(record.expenses || 0),
            0
          );

        setTotals({
          revenue: Number(
            result.totals?.revenue ??
              calculatedRevenue
          ),

          expenses: Number(
            result.totals?.expenses ??
              calculatedExpenses
          ),

          profit: Number(
            result.totals?.profit ??
              calculatedRevenue -
                calculatedExpenses
          ),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Revenue chart load error:",
            error
          );

          setError(
            error.message ||
              "Revenue chart data could not be loaded."
          );

          setData(EMPTY_DATA);

          setTotals({
            revenue: 0,
            expenses: 0,
            profit: 0,
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRevenueChart();

    return () => {
      controller.abort();
    };
  }, [selectedYear]);

  /*
  |--------------------------------------------------------------------------
  | Selected chart data موجود ہے یا نہیں
  |--------------------------------------------------------------------------
  */

  const hasData = useMemo(() => {
    if (selectedMetric === "revenue") {
      return data.some(
        (record) =>
          Number(record.revenue) > 0
      );
    }

    if (selectedMetric === "expenses") {
      return data.some(
        (record) =>
          Number(record.expenses) > 0
      );
    }

    return data.some(
      (record) =>
        Number(record.revenue) > 0 ||
        Number(record.expenses) > 0
    );
  }, [data, selectedMetric]);

  /*
  |--------------------------------------------------------------------------
  | Chart heading کے نیچے selected information
  |--------------------------------------------------------------------------
  */

  const chartDescription = useMemo(() => {
    if (selectedMetric === "revenue") {
      return `Monthly revenue for ${selectedYear}`;
    }

    if (selectedMetric === "expenses") {
      return `Monthly expenses for ${selectedYear}`;
    }

    return `Monthly revenue and expenses for ${selectedYear}`;
  }, [selectedMetric, selectedYear]);

  const metricButtonClass = (metric) => {
    const isActive =
      selectedMetric === metric;

    return `
      flex items-center gap-2 rounded-lg
      border px-3 py-2 text-sm font-medium
      transition
      ${
        isActive
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      }
    `;
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Revenue Chart
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {chartDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year */}
            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(event.target.value)
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {[0, 1, 2, 3, 4].map(
                (yearsBack) => {
                  const year =
                    currentYear - yearsBack;

                  return (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  );
                }
              )}
            </select>

            {/* Both */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric("both")
              }
              className={metricButtonClass(
                "both"
              )}
            >
              <span className="flex items-center -space-x-1">
                <span className="h-3 w-3 rounded-full bg-purple-600" />

                <span className="h-3 w-3 rounded-full bg-slate-400" />
              </span>

              Both
            </button>

            {/* Revenue */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric("revenue")
              }
              className={metricButtonClass(
                "revenue"
              )}
            >
              <span className="h-3 w-3 rounded-full bg-purple-600" />

              Revenue
            </button>

            {/* Expenses */}
            <button
              type="button"
              onClick={() =>
                setSelectedMetric("expenses")
              }
              className={metricButtonClass(
                "expenses"
              )}
            >
              <span className="h-3 w-3 rounded-full bg-slate-400" />

              Expenses
            </button>

            {/* View All */}
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
            >
              View All
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Chart */}
        <div className="relative h-80">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/80">
              <p className="text-sm text-slate-500">
                Loading revenue chart...
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            !hasData && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <p className="text-center text-sm text-slate-500">
                  No{" "}
                  {selectedMetric === "both"
                    ? "revenue or expense"
                    : selectedMetric}{" "}
                  data found for{" "}
                  {selectedYear}.
                </p>
              </div>
            )}

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 25,
                bottom: 5,
              }}
              barGap={8}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#3b82f6"
                  />

                  <stop
                    offset="100%"
                    stopColor="#8b5cf6"
                  />
                </linearGradient>

                <linearGradient
                  id="expensesGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#94a3b8"
                  />

                  <stop
                    offset="100%"
                    stopColor="#64748b"
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                opacity={0.3}
              />

              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={
                  formatYAxisValue
                }
              />

              <Tooltip
                contentStyle={{
                  backgroundColor:
                    "rgba(255, 255, 255, 0.97)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow:
                    "0 10px 40px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value, name) => [
                  formatCurrency(value),

                  name === "revenue"
                    ? "Revenue"
                    : "Expenses",
                ]}
              />

              {(selectedMetric === "both" ||
                selectedMetric ===
                  "revenue") && (
                <Bar
                  dataKey="revenue"
                  fill="url(#revenueGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={500}
                />
              )}

              {(selectedMetric === "both" ||
                selectedMetric ===
                  "expenses") && (
                <Bar
                  dataKey="expenses"
                  fill="url(#expensesGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={500}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Totals */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3 dark:border-slate-700">
          <button
            type="button"
            onClick={() =>
              setSelectedMetric("revenue")
            }
            className={`rounded-xl p-3 text-left transition ${
              selectedMetric === "revenue"
                ? "bg-purple-50 dark:bg-purple-900/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <p className="text-xs text-slate-500">
              Total Revenue
            </p>

            <p className="font-bold text-slate-800 dark:text-white">
              {formatCurrency(
                totals.revenue
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedMetric("expenses")
            }
            className={`rounded-xl p-3 text-left transition ${
              selectedMetric === "expenses"
                ? "bg-slate-100 dark:bg-slate-800"
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <p className="text-xs text-slate-500">
              Total Expenses
            </p>

            <p className="font-bold text-slate-800 dark:text-white">
              {formatCurrency(
                totals.expenses
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedMetric("both")
            }
            className={`rounded-xl p-3 text-left transition ${
              selectedMetric === "both"
                ? "bg-blue-50 dark:bg-blue-900/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <p className="text-xs text-slate-500">
              Net Difference
            </p>

            <p
              className={`font-bold ${
                totals.profit >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(
                totals.profit
              )}
            </p>
          </button>
        </div>
      </div>

      {/* View All Modal */}
      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAll(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  Revenue and Expense Details
                </h3>

                <p className="text-sm text-slate-500">
                  Complete monthly details for{" "}
                  {selectedYear}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAll(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Filters */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-6 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() =>
                  setSelectedMetric("both")
                }
                className={metricButtonClass(
                  "both"
                )}
              >
                Both
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedMetric("revenue")
                }
                className={metricButtonClass(
                  "revenue"
                )}
              >
                Revenue
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedMetric("expenses")
                }
                className={metricButtonClass(
                  "expenses"
                )}
              >
                Expenses
              </button>
            </div>

            {/* Modal Table */}
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[650px]">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Month
                    </th>

                    {selectedMetric !==
                      "expenses" && (
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Revenue
                      </th>
                    )}

                    {selectedMetric !==
                      "revenue" && (
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Expenses
                      </th>
                    )}

                    {selectedMetric ===
                      "both" && (
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Difference
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {data.map((record) => (
                    <tr
                      key={
                        record.monthNumber
                      }
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {record.month}
                      </td>

                      {selectedMetric !==
                        "expenses" && (
                        <td className="px-6 py-4 text-right text-sm text-slate-700 dark:text-slate-300">
                          {formatCurrency(
                            record.revenue
                          )}
                        </td>
                      )}

                      {selectedMetric !==
                        "revenue" && (
                        <td className="px-6 py-4 text-right text-sm text-slate-700 dark:text-slate-300">
                          {formatCurrency(
                            record.expenses
                          )}
                        </td>
                      )}

                      {selectedMetric ===
                        "both" && (
                        <td
                          className={`px-6 py-4 text-right text-sm font-semibold ${
                            Number(
                              record.profit
                            ) >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(
                            record.profit
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>

                <tfoot className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">
                      Total
                    </td>

                    {selectedMetric !==
                      "expenses" && (
                      <td className="px-6 py-4 text-right text-sm text-slate-800 dark:text-white">
                        {formatCurrency(
                          totals.revenue
                        )}
                      </td>
                    )}

                    {selectedMetric !==
                      "revenue" && (
                      <td className="px-6 py-4 text-right text-sm text-slate-800 dark:text-white">
                        {formatCurrency(
                          totals.expenses
                        )}
                      </td>
                    )}

                    {selectedMetric ===
                      "both" && (
                      <td
                        className={`px-6 py-4 text-right text-sm ${
                          totals.profit >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(
                          totals.profit
                        )}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RevenueChart;