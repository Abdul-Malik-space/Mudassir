import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, ShoppingCart, Eye, Flag, Moon } from 'lucide-react';

const statsData = [
    { title: "Total Revenue", value: "Rs 124,563", change: "+12.5%", trend: "up", icon: Moon, color: "from-emerald-500 to-teal-600" },
    { title: "Total Expenses", value: "8,549", change: "+8.2%", trend: "up", icon: Users, color: "from-blue-500 to-indigo-600" },
    { title: "Total Urwa Customers", value: "2,847", change: "+15.3%", trend: "up", icon: ShoppingCart, color: "from-purple-500 to-pink-600" },
    { title: "Urwa Ready Products", value: "45,892", change: "-2.1%", trend: "down", icon: Eye, color: "from-orange-500 to-red-600" }
];

function StatsGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {statsData.map((item, index) => {
                
                return (
                    <div key={index} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    {item.title}
                                </p>
                                <p className='text-3xl font-bold text-slate-800 dark:text-white mb-4'>
                                    {item.value}
                                </p>
                                <div className="flex items-center space-x-2">
                                    
                                    {item.trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
                                    
                                    <span className={item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}>
                                        {item.change}
                                    </span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        vs Last
                                    </span>
                                </div>
                            </div>
                            
                            {/* icon and color*/}
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} text-white group-hover:scale-110 transition-all duration-200`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                        </div>

                        {/* Progress bar*/}
                        <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`w-full h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default StatsGrid;