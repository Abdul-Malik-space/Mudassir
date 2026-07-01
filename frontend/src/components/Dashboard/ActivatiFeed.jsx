import React from 'react'
import { User, ShoppingCart, CreditCard, Settings, Clock, Package, MessageSquare } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: "user",
    icon: User,
    title: "New user registered",
    description: "John Smith created an account",
    time: "2 minutes ago",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: 2,
    type: "order",
    icon: ShoppingCart,
    title: "New order received",
    description: "Order #3847 for $2,399",
    time: "5 minutes ago",
    color: "text-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    id: 3,
    type: "payment",
    icon: CreditCard,
    title: "Payment processed",
    description: "Payment of $1,199 completed",
    time: "12 minutes ago",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    id: 4,
    type: "system",
    icon: Settings,
    title: "System update",
    description: "Database backup completed",
    time: "1 hour ago",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    id: 5,
    type: "shipping",
    icon: Package,
    title: "Order shipped",
    description: "Order #3840 is on its way",
    time: "2 hours ago",
    color: "text-pink-500",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    id: 6,
    type: "message",
    icon: MessageSquare,
    title: "New message",
    description: "You received a new inquiry",
    time: "5 hours ago",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  }
];

const ActivityFeed = () => {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Feed</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recent System Activities</p>
          </div>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
        </div>
      </div>

      {/* List */}
      <div className="p-6 space-y-6">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-4">
              {/* Icon Container */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${activity.bgColor}`}>
                <Icon className={`w-5 h-5 ${activity.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {activity.title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {activity.description}
                </p>
                
                {/* Time with Clock Icon */}
                <div className="flex items-center mt-1 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;