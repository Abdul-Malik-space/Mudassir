import React from "react";
import {
  Menu,
  Search,
  Filter,
  Sun,
  Bell,
  Settings,
  ChevronDown,
} from "lucide-react";

import urwaLogo from "./urwa.png";

function Header({ onToggleSidebar }) {
  return (
    <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
      <div className="w-full px-4 sm:px-5 xl:px-6 py-3">
        <div
          className="
            grid
            grid-cols-[minmax(0,1fr)_auto]
            lg:grid-cols-[minmax(260px,1fr)_minmax(220px,420px)_auto]
            items-center
            gap-x-4
            gap-y-3
          "
        >
          {/* Left Section */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              className="
                w-10 h-10
                flex-shrink-0
                inline-flex items-center justify-center
                rounded-xl
                text-slate-600
                dark:text-slate-300
                hover:bg-slate-100
                dark:hover:bg-slate-800
                transition-colors
              "
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight truncate">
                Dashboard
              </h1>

              <p className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome back, Alex! Here's what's happening today
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div
            className="
              order-3
              col-span-2
              w-full
              lg:order-none
              lg:col-span-1
              lg:max-w-[420px]
              lg:justify-self-center
            "
          >
            <div className="relative w-full">
              <Search
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  w-4 h-4
                  text-slate-400
                  pointer-events-none
                "
              />

              <input
                type="text"
                placeholder="Search Anything"
                className="
                  w-full
                  h-11
                  pl-10
                  pr-12
                  bg-slate-100
                  dark:bg-slate-800
                  border
                  border-slate-200
                  dark:border-slate-700
                  rounded-xl
                  text-sm
                  text-slate-800
                  dark:text-white
                  placeholder:text-slate-500
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-transparent
                  transition-all
                "
              />

              <button
                type="button"
                aria-label="Search filters"
                className="
                  absolute
                  right-2
                  top-1/2
                  -translate-y-1/2
                  w-8 h-8
                  inline-flex items-center justify-center
                  rounded-lg
                  text-slate-400
                  hover:text-slate-700
                  hover:bg-white
                  dark:hover:text-slate-200
                  dark:hover:bg-slate-700
                  transition-colors
                "
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              type="button"
              aria-label="Change theme"
              className="
                w-10 h-10
                inline-flex items-center justify-center
                rounded-xl
                text-slate-600
                dark:text-slate-300
                hover:bg-slate-100
                dark:hover:bg-slate-800
                transition-colors
              "
            >
              <Sun className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              className="
                relative
                w-10 h-10
                inline-flex items-center justify-center
                rounded-xl
                text-slate-600
                dark:text-slate-300
                hover:bg-slate-100
                dark:hover:bg-slate-800
                transition-colors
              "
            >
              <Bell className="w-5 h-5" />

              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  min-w-5
                  h-5
                  px-1
                  bg-red-500
                  text-white
                  text-[11px]
                  font-bold
                  rounded-full
                  inline-flex items-center justify-center
                  border-2
                  border-white
                  dark:border-slate-900
                "
              >
                3
              </span>
            </button>

            {/* Settings */}
            <button
              type="button"
              aria-label="Settings"
              className="
                w-10 h-10
                inline-flex items-center justify-center
                rounded-xl
                text-slate-600
                dark:text-slate-300
                hover:bg-slate-100
                dark:hover:bg-slate-800
                transition-colors
              "
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Profile */}
            <button
              type="button"
              className="
                ml-1
                pl-3
                flex items-center
                gap-2.5
                border-l
                border-slate-200
                dark:border-slate-700
                min-w-0
              "
            >
              <img
                src={urwaLogo}
                alt="Urwa Packages"
                className="
                  w-9 h-9
                  rounded-full
                  object-cover
                  flex-shrink-0
                  ring-2
                  ring-blue-500
                  ring-offset-2
                  ring-offset-white
                  dark:ring-offset-slate-900
                "
              />

              <div className="hidden xl:block text-left min-w-0 max-w-[130px]">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  Urwa Packages
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Administrator
                </p>
              </div>

              <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;