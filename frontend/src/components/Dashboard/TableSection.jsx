import React from 'react'
import { TrendingUp } from 'lucide-react';



const recentOrders = [
    {
        id: "#3847",
        customer: "John Smith",
        product: "MacBook Pro 16\"",
        amount: "RS 2,399",
        status: "completed",
        date: "2024-01-15",
    },
    {
        id: "#3848",
        customer: "Sarah Johnson",
        product: "iPhone 15 Pro",
        amount: "Rs 1,199",
        status: "pending",
        date: "2024-01-15",
    },
    {
        id: "#3849",
        customer: "Michael Brown",
        product: "iPad Pro M2",
        amount: "Rs 999",
        status: "completed",
        date: "2024-01-14",
    },
    {
        id: "#3850",
        customer: "Emily Davis",
        product: "Apple Watch Ultra",
        amount: "Rs 799",
        status: "cancelled",
        date: "2024-01-14",
    },
    {
        id: "#3851",
        customer: "David Wilson",
        product: "AirPods Max",
        amount: "Rs 549",
        status: "completed",
        date: "2024-01-13",
    }
];


const topProducts = [
    {
        name: "MacBook Pro 16\"",
        sales: 1247,
        revenue: "Rs 2,987,530",
        trend: "up",
        change: "+12%",
    },
    {
        name: "iPhone 15 Pro",
        sales: 2156,
        revenue: "Rs 2,587,044",
        trend: "up",
        change: "+8%",
    },
    {
        name: "AirPods Pro",
        sales: 3421,
        revenue: "Rs 852,229",
        trend: "up",
        change: "+15%",
    },
    {
        name: "iPad Pro M2",
        sales: 984,
        revenue: "Rs 1,180,800",
        trend: "down",
        change: "-5%",
    },
    {
        name: "Apple Watch Ultra",
        sales: 1562,
        revenue: "Rs 1,248,038",
        trend: "up",
        change: "+10%",
    }
];

function TableSection() {


    const getStatusColor = (status) => {
        switch (status) {
            case "completed":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            case "pending":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "cancelled":
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            default:
                return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
        }
    };
    return (
        <div className="space-y-6">
            {/* Recent Order */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-b-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Recent Orders
                            </h3>
                            <p className='text-sm text-slate-500 dard:text-slate-400'>Latest Customers Orders</p>
                        </div>
                        <button className='text-blue-600 hover:text-blue-700 text-sm font-medium'>View All</button>
                    </div>
                </div>

                {/* Table */}
                <div className='overflow-x-auto'>
                    <table className='w-full'>
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className='text-left p-4 text-sm font-semibold text-slate-600'> Order ID</th>
                                <th className='text-left p-4 text-sm font-semibold text-slate-600'> Product</th>
                                <th className='text-left p-4 text-sm font-semibold text-slate-600'> Amount</th>
                                <th className='text-left p-4 text-sm font-semibold text-slate-600'> Stats</th>
                                <th className='text-left p-4 text-sm font-semibold text-slate-600'> Date</th>
                            </tr>
                        </thead>

                        {/*tbody*/}
                        <tbody>
                            {recentOrders.map((order, index) => {
                                return (
                                    <tr key={index} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 text-sm font-medium text-slate-700 dark:text-slate-300">{order.id}</td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{order.customer}</td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{order.product}</td>
                                        <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{order.amount}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{order.date}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Top Products */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                Top Products
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Best performing products
                            </p>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            View All
                        </button>
                    </div>

                    {/* Dynamic Data */}
                    <div className="p-6 space-y-4">
                        <div className="p-6 space-y-4">
                            {topProducts.map((product, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {product.name}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {product.sales.toLocaleString()} Sales
                                        </p>
                                    </div>


                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {product.revenue}
                                        </p>
                                        <div className="flex items-center justify-end space-x-1">

                                            <TrendingUp className={`w-3 h-3 ${product.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`} />
                                            <span className={`text-xs font-medium ${product.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {product.change}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                
            </div>
        </div>
    )
}

export default TableSection
