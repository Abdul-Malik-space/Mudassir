import React, { useEffect, useMemo, useState } from "react";

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
import PaymentsReceived from "./Pages/PaymentsReceived";
import SaleEntry from "./Pages/Sales";
import SalesOrders from "./Pages/SalesOrders";
import DeliveryChallans from "./Pages/DeliveryChallans";
import Invoices from "./Pages/Invoices";
import ExpensePro from "./Pages/Expenses";
import PayrollEntry from "./Pages/Payroll";
import AccountsOverview from "./Pages/Accounts";
import ReportsDashboard from "./Pages/Reports";
import WarehousePage from "./Pages/Warehouse";
import SettingsPro from "./Pages/Setting";

import Login from "./Pages/Login";
import ChangePassword from "./Pages/ChangePassword";
import UserManagement from "./Pages/UserManagement";
import AccessDenied from "./Pages/AccessDenied";
import { useAuth } from "./auth/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-400 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-300">
          Verifying secure session...
        </p>
      </div>
    </div>
  );
}

function App() {
  const {
    user,
    initializing,
    canAccessPage,
    firstAccessiblePage,
  } = useAuth();
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (
      currentPage !== "change-password" &&
      !canAccessPage(currentPage)
    ) {
      setCurrentPage(firstAccessiblePage);
      setDenied(false);
    }
  }, [user, currentPage, canAccessPage, firstAccessiblePage]);

  const pageComponents = useMemo(
    () => ({
      dashboard: <Dashboard />,
      customers: <AddCustomer />,
      vendors: <AddVendor />,
      traders: <AddTraders />,
      "list-items": <AddItemsList />,
      "categories-list": <AddCatagries />,
      "brand-list": <BrandLIst />,
      "unit-list": <UnitManager />,
      "purchase-orders": <PurchaseOrders />,
      grn: <GRN />,
      purchases: <Purchases />,
      "production-items": <ProductionItemsManager />,
      lamination: <LaminationForm />,
      printing: <PrintingEntry />,
      "die-cutting": <DieCuttingEntry />,
      pasting: <PastingEntry />,
      "other-work": <OtherWorkEntry />,
      departments: <DepartmentForm />,
      "ready-product": <ReadyProductEntry />,
      sale: <SaleEntry />,
      "sales-orders": <SalesOrders />,
      "delivery-challans": <DeliveryChallans />,
      invoices: <Invoices />,
      "payments-received": <PaymentsReceived />,
      "general-journal": <GeneralJournal />,
      expense: <ExpensePro />,
      payroll: <PayrollEntry />,
      accounts: <AccountsOverview />,
      warehouses: <WarehousePage />,
      reports: <ReportsDashboard />,
      settings: <SettingsPro />,
      "user-management": <UserManagement />,
      "change-password": (
        <ChangePassword
          embedded
          onComplete={() => setCurrentPage(firstAccessiblePage)}
        />
      ),
    }),
    [firstAccessiblePage]
  );

  const handlePageChange = (pageId) => {
    if (pageId === "change-password" || canAccessPage(pageId)) {
      setDenied(false);
      setCurrentPage(pageId);
      return;
    }

    setDenied(true);
  };

  if (initializing) return <LoadingScreen />;
  if (!user) return <Login />;

  if (user.mustChangePassword) {
    return (
      <ChangePassword
        onComplete={() => setCurrentPage(firstAccessiblePage)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          collapsed={sideBarCollapsed}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            onToggleSidebar={() => setSideBarCollapsed((current) => !current)}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-4 sm:p-6">
              {denied ? (
                <AccessDenied
                  onBack={() => {
                    setDenied(false);
                    setCurrentPage(firstAccessiblePage);
                  }}
                />
              ) : (
                pageComponents[currentPage] || (
                  <AccessDenied
                    onBack={() => setCurrentPage(firstAccessiblePage)}
                  />
                )
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
