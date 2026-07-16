import React, {
  useEffect,
  useState,
} from "react";

import {
  User,
  ShoppingCart,
  CreditCard,
  Clock,
  Package,
  Truck,
  ClipboardCheck,
  X,
} from "lucide-react";

import {
  API_BASE_URL,
} from "../../config/api";

/*
|--------------------------------------------------------------------------
| API Request Helper
|--------------------------------------------------------------------------
*/

const apiRequest = async (
  endpoint,
  options = {}
) => {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        Accept: "application/json",
        ...(options.body
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
        ...(options.headers || {}),
      },

      ...options,
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  /*
  |--------------------------------------------------------------------------
  | اگر Backend JSON کے بجائے HTML واپس کرے
  |--------------------------------------------------------------------------
  */

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    const responseText =
      await response.text();

    console.error(
      "Activity Feed API returned non-JSON:",
      {
        url: `${API_BASE_URL}${endpoint}`,
        status: response.status,
        contentType,
        response:
          responseText.slice(0, 300),
      }
    );

    throw new Error(
      `API نے JSON کے بجائے HTML واپس کیا۔ Status: ${response.status}`
    );
  }

  const result =
    await response.json();

  if (
    !response.ok ||
    result.success === false
  ) {
    throw new Error(
      result.error ||
        result.message ||
        `Request failed with status ${response.status}`
    );
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| Activity Type Configuration
|--------------------------------------------------------------------------
*/

const ACTIVITY_CONFIG = {
  customer: {
    icon: User,
    color: "text-blue-500",
    background:
      "bg-blue-100 dark:bg-blue-900/30",
  },

  order: {
    icon: ShoppingCart,
    color: "text-emerald-500",
    background:
      "bg-emerald-100 dark:bg-emerald-900/30",
  },

  sale: {
    icon: CreditCard,
    color: "text-purple-500",
    background:
      "bg-purple-100 dark:bg-purple-900/30",
  },

  delivery: {
    icon: Truck,
    color: "text-pink-500",
    background:
      "bg-pink-100 dark:bg-pink-900/30",
  },

  grn: {
    icon: ClipboardCheck,
    color: "text-orange-500",
    background:
      "bg-orange-100 dark:bg-orange-900/30",
  },

  readyProduct: {
    icon: Package,
    color: "text-cyan-500",
    background:
      "bg-cyan-100 dark:bg-cyan-900/30",
  },

  default: {
    icon: Package,
    color: "text-slate-500",
    background:
      "bg-slate-100 dark:bg-slate-800",
  },
};

/*
|--------------------------------------------------------------------------
| Relative Time
|--------------------------------------------------------------------------
*/

const formatRelativeTime = (
  value
) => {
  if (!value) {
    return "Unknown time";
  }

  const activityDate =
    new Date(value);

  if (
    Number.isNaN(
      activityDate.getTime()
    )
  ) {
    return "Unknown time";
  }

  const currentDate =
    new Date();

  const differenceInSeconds =
    Math.max(
      0,
      Math.floor(
        (currentDate -
          activityDate) /
          1000
      )
    );

  if (
    differenceInSeconds < 60
  ) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      differenceInSeconds / 60
    );

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 30) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  const months =
    Math.floor(days / 30);

  if (months < 12) {
    return `${months} month${
      months === 1 ? "" : "s"
    } ago`;
  }

  const years =
    Math.floor(months / 12);

  return `${years} year${
    years === 1 ? "" : "s"
  } ago`;
};

/*
|--------------------------------------------------------------------------
| Full Date
|--------------------------------------------------------------------------
*/

const formatFullDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "en-PK",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

/*
|--------------------------------------------------------------------------
| Activity Item
|--------------------------------------------------------------------------
*/

function ActivityItem({
  activity,
}) {
  const safeActivity =
    activity || {};

  const config =
    ACTIVITY_CONFIG[
      safeActivity.type
    ] ||
    ACTIVITY_CONFIG.default;

  const Icon = config.icon;

  return (
    <div className="flex items-start space-x-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.background}`}
      >
        <Icon
          className={`h-5 w-5 ${config.color}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
          {safeActivity.title ||
            "System activity"}
        </h4>

        <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">
          {safeActivity.description ||
            "No description available"}
        </p>

        <div
          className="mt-1 flex items-center text-xs text-slate-400 dark:text-slate-500"
          title={formatFullDate(
            safeActivity.createdAt
          )}
        >
          <Clock className="mr-1 h-3.5 w-3.5" />

          <span>
            {formatRelativeTime(
              safeActivity.createdAt
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Main Activity Feed
|--------------------------------------------------------------------------
*/

const ActivityFeed = () => {
  const [
    activities,
    setActivities,
  ] = useState([]);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showAll, setShowAll] =
    useState(false);

  const [
    allActivities,
    setAllActivities,
  ] = useState([]);

  const [
    modalLoading,
    setModalLoading,
  ] = useState(false);

  const [
    modalError,
    setModalError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | تازہ 6 Activities Load کرنا
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller =
      new AbortController();

    const loadActivityFeed =
      async () => {
        try {
          setLoading(true);
          setError("");

          const result =
            await apiRequest(
              "/dashboard/activity-feed?limit=6",
              {
                signal:
                  controller.signal,
              }
            );

          setActivities(
            Array.isArray(
              result.data
            )
              ? result.data
              : []
          );

          setTotal(
            Number(
              result.total || 0
            )
          );
        } catch (
          requestError
        ) {
          if (
            requestError.name !==
            "AbortError"
          ) {
            console.error(
              "Activity feed load error:",
              requestError
            );

            setError(
              requestError.message ||
                "Activity feed could not be loaded."
            );

            setActivities([]);
            setTotal(0);
          }
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setLoading(false);
          }
        }
      };

    loadActivityFeed();

    return () => {
      controller.abort();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | View All Activities
  |--------------------------------------------------------------------------
  */

  const openAllActivities =
    async () => {
      setShowAll(true);
      setModalError("");

      if (
        allActivities.length > 0
      ) {
        return;
      }

      try {
        setModalLoading(true);

        const result =
          await apiRequest(
            "/dashboard/activity-feed?limit=200"
          );

        setAllActivities(
          Array.isArray(
            result.data
          )
            ? result.data
            : []
        );

        setTotal(
          Number(
            result.total || 0
          )
        );
      } catch (
        requestError
      ) {
        console.error(
          "All activities load error:",
          requestError
        );

        setModalError(
          requestError.message ||
            "All activities could not be loaded."
        );
      } finally {
        setModalLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Modal Close
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    setShowAll(false);
    setModalError("");
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        {/* Header */}
        <div className="border-b border-slate-200/50 p-6 dark:border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Activity Feed
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recent system
                activities
              </p>
            </div>

            <button
              type="button"
              onClick={
                openAllActivities
              }
              className="flex-shrink-0 text-sm font-medium text-blue-600 transition hover:text-blue-700"
            >
              View All
              {total > 0
                ? ` (${total})`
                : ""}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Activity List */}
        <div className="space-y-6 p-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Loading
              activities...
            </div>
          ) : activities.length ===
            0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No activities found.
            </div>
          ) : (
            activities.map(
              (
                activity,
                index
              ) => (
                <ActivityItem
                  key={
                    activity.id ||
                    `${activity.type}-${index}`
                  }
                  activity={
                    activity
                  }
                />
              )
            )
          )}
        </div>
      </div>

      {/* View All Modal */}
      {showAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  All Activities
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {total > 200
                    ? `Showing latest 200 of ${total} activities`
                    : `${total} activities`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[75vh] overflow-y-auto p-6">
              {modalLoading ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  Loading all
                  activities...
                </div>
              ) : modalError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {modalError}
                </div>
              ) : allActivities.length ===
                0 ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  No activities
                  found.
                </div>
              ) : (
                <div className="space-y-6">
                  {allActivities.map(
                    (
                      activity,
                      index
                    ) => (
                      <ActivityItem
                        key={
                          activity.id ||
                          `${activity.type}-${index}`
                        }
                        activity={
                          activity
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActivityFeed;