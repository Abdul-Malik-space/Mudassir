import React, {
  useEffect,
  useState,
} from "react";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  return `Rs ${Number(
    value || 0
  ).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
};

/*
|--------------------------------------------------------------------------
| Date
|--------------------------------------------------------------------------
*/

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const textValue = String(value);

  if (
    /^\d{4}-\d{2}-\d{2}/.test(textValue)
  ) {
    return textValue.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return textValue;
  }

  return date.toLocaleDateString("en-CA");
};

/*
|--------------------------------------------------------------------------
| Status Color
|--------------------------------------------------------------------------
*/

const getStatusColor = (status = "") => {
  switch (status.toLowerCase()) {
    case "delivered":
    case "invoiced":
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";

    case "confirmed":
    case "ready":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

    case "in production":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";

    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

    case "draft":
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
};

/*
|--------------------------------------------------------------------------
| Recent Orders Table
|--------------------------------------------------------------------------
*/

function RecentOrdersTable({ orders }) {
  if (!orders.length) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        No sales orders found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Order ID
            </th>

            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Customer
            </th>

            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Product
            </th>

            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Amount
            </th>

            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Status
            </th>

            <th className="p-4 text-left text-sm font-semibold text-slate-600">
              Date
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order, index) => (
            <tr
              key={`${order.orderId}-${index}`}
              className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/50"
            >
              <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                {order.orderId}
              </td>

              <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                {order.customer}
              </td>

              <td className="max-w-[260px] p-4 text-sm text-slate-600 dark:text-slate-400">
                <span
                  className="block truncate"
                  title={order.product}
                >
                  {order.product}
                </span>

                {Number(order.itemCount) >
                  1 && (
                  <span className="text-xs text-slate-400">
                    {order.itemCount} items
                  </span>
                )}
              </td>

              <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {formatCurrency(order.amount)}
              </td>

              <td className="p-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </td>

              <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                {formatDate(order.date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Trend Icon
|--------------------------------------------------------------------------
*/

function TrendIndicator({ product }) {
  if (product.trend === "up") {
    return (
      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
    );
  }

  if (product.trend === "down") {
    return (
      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    );
  }

  return (
    <Minus className="h-3.5 w-3.5 text-slate-400" />
  );
}

/*
|--------------------------------------------------------------------------
| Top Products
|--------------------------------------------------------------------------
*/

function TopProductsList({ products }) {
  if (!products.length) {
    return (
      <div className="px-6 py-12 text-center text-sm text-slate-500">
        No product sales found for this year.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-6">
      {products.map((product, index) => (
        <div
          key={`${product.name}-${index}`}
          className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-slate-800 dark:text-white">
              {product.name}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {Number(
                product.sales || 0
              ).toLocaleString("en-PK")}{" "}
              units
              {" • "}
              {Number(
                product.salesCount || 0
              ).toLocaleString("en-PK")}{" "}
              transactions
            </p>
          </div>

          <div className="ml-4 text-right">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {formatCurrency(product.revenue)}
            </p>

            <div className="flex items-center justify-end gap-1">
              <TrendIndicator
                product={product}
              />

              <span
                className={`text-xs font-medium ${
                  product.trend === "up"
                    ? "text-emerald-500"
                    : product.trend ===
                        "down"
                      ? "text-red-500"
                      : "text-slate-400"
                }`}
              >
                {product.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Modal
|--------------------------------------------------------------------------
*/

function DataModal({
  title,
  subtitle,
  onClose,
  children,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {title}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

function TableSection() {
  const currentYear =
    new Date().getFullYear();

  const [summary, setSummary] = useState({
    recentOrders: {
      items: [],
      total: 0,
      hasMore: false,
    },

    topProducts: {
      items: [],
      total: 0,
      hasMore: false,
    },
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeModal, setActiveModal] =
    useState(null);

  const [modalLoading, setModalLoading] =
    useState(false);

  const [modalError, setModalError] =
    useState("");

  const [
    allRecentOrders,
    setAllRecentOrders,
  ] = useState([]);

  const [
    allTopProducts,
    setAllTopProducts,
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | Dashboard summary load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller = new AbortController();

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/dashboard/table-section?year=${currentYear}&recentLimit=5&productLimit=5`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Table section data could not be loaded."
          );
        }

        setSummary({
          recentOrders: {
            items: Array.isArray(
              result.recentOrders?.items
            )
              ? result.recentOrders.items
              : [],

            total: Number(
              result.recentOrders?.total || 0
            ),

            hasMore: Boolean(
              result.recentOrders?.hasMore
            ),
          },

          topProducts: {
            items: Array.isArray(
              result.topProducts?.items
            )
              ? result.topProducts.items
              : [],

            total: Number(
              result.topProducts?.total || 0
            ),

            hasMore: Boolean(
              result.topProducts?.hasMore
            ),
          },
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Table section load error:",
            error
          );

          setError(
            error.message ||
              "Table section data could not be loaded."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => controller.abort();
  }, [currentYear]);

  /*
  |--------------------------------------------------------------------------
  | View All Recent Orders
  |--------------------------------------------------------------------------
  */

  const openRecentOrders = async () => {
    setActiveModal("recentOrders");
    setModalError("");

    if (allRecentOrders.length > 0) {
      return;
    }

    try {
      setModalLoading(true);

      const response = await fetch(
        "/api/dashboard/table-section/recent-orders"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Recent orders could not be loaded."
        );
      }

      setAllRecentOrders(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (error) {
      console.error(
        "All recent orders error:",
        error
      );

      setModalError(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | View All Top Products
  |--------------------------------------------------------------------------
  */

  const openTopProducts = async () => {
    setActiveModal("topProducts");
    setModalError("");

    if (allTopProducts.length > 0) {
      return;
    }

    try {
      setModalLoading(true);

      const response = await fetch(
        `/api/dashboard/table-section/top-products?year=${currentYear}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Top products could not be loaded."
        );
      }

      setAllTopProducts(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (error) {
      console.error(
        "All top products error:",
        error
      );

      setModalError(error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError("");
  };

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Recent Orders */}
        <div className="overflow-hidden rounded-b-2xl border border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
          <div className="border-b border-slate-200/50 p-6 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Recent Orders
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Latest customer sales orders
                </p>
              </div>

              {summary.recentOrders
                .hasMore && (
                <button
                  type="button"
                  onClick={openRecentOrders}
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                  View All (
                  {
                    summary.recentOrders
                      .total
                  }
                  )
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Loading recent orders...
            </div>
          ) : (
            <RecentOrdersTable
              orders={
                summary.recentOrders.items
              }
            />
          )}
        </div>

        {/* Top Products */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
          <div className="border-b border-slate-200/50 p-6 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Top Products
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Best performing products for{" "}
                  {currentYear}
                </p>
              </div>

              {summary.topProducts
                .hasMore && (
                <button
                  type="button"
                  onClick={openTopProducts}
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                  View All (
                  {
                    summary.topProducts
                      .total
                  }
                  )
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Loading top products...
            </div>
          ) : (
            <TopProductsList
              products={
                summary.topProducts.items
              }
            />
          )}
        </div>
      </div>

      {/* Recent Orders Modal */}
      {activeModal === "recentOrders" && (
        <DataModal
          title="All Recent Orders"
          subtitle={`${summary.recentOrders.total} sales orders`}
          onClose={closeModal}
        >
          {modalLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading all orders...
            </div>
          ) : modalError ? (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {modalError}
            </div>
          ) : (
            <RecentOrdersTable
              orders={allRecentOrders}
            />
          )}
        </DataModal>
      )}

      {/* Top Products Modal */}
      {activeModal === "topProducts" && (
        <DataModal
          title="All Top Products"
          subtitle={`Product performance for ${currentYear}`}
          onClose={closeModal}
        >
          {modalLoading ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Loading all products...
            </div>
          ) : modalError ? (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {modalError}
            </div>
          ) : (
            <TopProductsList
              products={allTopProducts}
            />
          )}
        </DataModal>
      )}
    </>
  );
}

export default TableSection;