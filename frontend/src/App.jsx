import React, { useState } from "react";

import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import Dashboard from "./components/Dashboard/Dashboard";

import AddCustomer from "./Pages/AddCustomer";
import AddVendor from "./Pages/vendor";
import AddTraders from "./Pages/AddTraders";

import AddItemsList from "./Pages/AddItemsList";
import AddCatagries from "./Pages/AddCatagries";
import BrandLIst from "./Pages/BrandLIst";
import UnitManager from "./Pages/Unitlist";

import PurchaseOrders from "./Pages/PurchaseOrders";
import GRN from "./Pages/GRN";
import Purchases from "./Pages/Purchases";

import LaminationForm from "./Pages/Lamination";
import PrintingEntry from "./Pages/PrintingForm";
import DieCuttingEntry from "./Pages/DieCutting";
import PastingEntry from "./Pages/Pasting";
import OtherWorkEntry from "./Pages/OtherWork";
import ProductionItemsManager from "./Pages/ProductionItemsManager";

import DepartmentForm from "./Pages/Department";
import ReadyProductEntry from "./Pages/ReadyProduct";

import GeneralJournal from "./Pages/GeneralJournal";

import SaleEntry from "./Pages/Sales";
import SalesOrders from "./Pages/SalesOrders";
import DeliveryChallans from "./Pages/DeliveryChallans";
import Invoices from "./Pages/Invoices";

import ExpensePro from "./Pages/Expenses";
import PayrollEntry from "./Pages/Payroll";
import AccountsOverview from "./Pages/Accounts";
import ReportsDashboard from "./Pages/Reports";
import WarehousePage from "./Pages/UrwaGodam";
import SettingsPro from "./Pages/Setting";

const ComingSoonPage = ({ title, description }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">{description}</p>
    </div>
  );
};

function App() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          collapsed={sideBarCollapsed}
          onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sidebarCollapsed={sideBarCollapsed}
            onToggleSidebar={() => setSideBarCollapsed(!sideBarCollapsed)}
          />

          <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)]">
            <div className="p-6 space-y-6">
              {currentPage === "dashboard" && <Dashboard />}

              {currentPage === "customers" && <AddCustomer />}
              {currentPage === "vendors" && <AddVendor />}
              {currentPage === "traders" && <AddTraders />}
              {currentPage === "general-journal" && <GeneralJournal />}
              {currentPage === "list-items" && <AddItemsList />}
              {currentPage === "categories-list" && <AddCatagries />}
              {currentPage === "brand-list" && <BrandLIst />}
              {currentPage === "unit-list" && <UnitManager />}

              {/* Purchase Pages */}
              {currentPage === "purchase-orders" && <PurchaseOrders />}
              {currentPage === "grn" && <GRN />}
             {currentPage === "purchases" && <Purchases />}

              {/* Production Pages */}
              {currentPage === "production-items" && <ProductionItemsManager />}
              {currentPage === "lamination" && <LaminationForm />}
              {currentPage === "printing" && <PrintingEntry />}
              {currentPage === "die-cutting" && <DieCuttingEntry />}
              {currentPage === "pasting" && <PastingEntry />}
              {currentPage === "other-work" && <OtherWorkEntry />}

              {currentPage === "departments" && <DepartmentForm />}
              {currentPage === "ready-product" && <ReadyProductEntry />}

              {/* Sales Pages */}
              {currentPage === "sale" && <SaleEntry />}
              {currentPage === "sales-orders" && <SalesOrders />}
              {currentPage === "delivery-challans" && <DeliveryChallans />}
              {currentPage === "invoices" && <Invoices />}

              {currentPage === "expense" && <ExpensePro />}
              {currentPage === "payroll" && <PayrollEntry />}
              {currentPage === "accounts" && <AccountsOverview />}
              {currentPage === "warehouses" && <WarehousePage />}
              {currentPage === "reports" && <ReportsDashboard />}
              {currentPage === "settings" && <SettingsPro />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;