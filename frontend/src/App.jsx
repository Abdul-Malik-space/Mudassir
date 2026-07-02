import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import AddCustomer from "./Pages/AddCustomer";
import AddVendor from './Pages/vendor';
import AddTraders from './Pages/AddTraders';
import AddItemsList from './Pages/AddItemsList';
import AddCatagries from './Pages/AddCatagries';
import BrandLIst from './Pages/BrandLIst';
import NewPurchase from './Pages/Purchase';
import LaminationForm from './Pages/Lamination';
import PrintingEntry from './Pages/PrintingForm';
import DieCuttingEntry from './Pages/DieCutting';
import PastingEntry from './Pages/Pasting';
import OtherWorkEntry from './Pages/OtherWork';
import DepartmentForm from './Pages/Department';
import ReadyProductEntry from './Pages/ReadyProduct';
import SaleEntry from './Pages/Sales';
import ExpensePro from './Pages/Expenses';
import PayrollEntry from './Pages/Payroll';
import AccountsOverview from './Pages/Accounts';
import ReportsDashboard from './Pages/Reports';
import WarehousePage from './Pages/UrwaGodam';
import SettingsPro from './Pages/Setting';
import UnitManager from './Pages/Unitlist'
import ProductionItemsManager from './Pages/ProductionItemsManager';
import SalesOrders from './Pages/SalesOrders';
import DeliveryChallans from './Pages/DeliveryChallans';
import Invoices from './Pages/Invoices';







function App() {
  const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className='flex h-screen overflow-hidden'>
        <Sidebar
          collapsed={sideBarCollapsed}
          onToggle={() => setSideBarCollapsed(!sideBarCollapsed)}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <div className='flex-1 flex flex-col overflow-hidden'> 
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
             {currentPage === "list-items" && <AddItemsList />}
             {currentPage === "categories-list" && <AddCatagries />}
             {currentPage === "brand-list" && <BrandLIst />}
             {currentPage === "unit-list" && <UnitManager />}
             {currentPage === "purchase" && <NewPurchase />}
             {currentPage === "lamination" && <LaminationForm />}
             {currentPage === "printing" && <PrintingEntry />}
             {currentPage === "die-cutting" && < DieCuttingEntry/>}
             {currentPage === "pasting" && < PastingEntry/>}
             {currentPage === "other-work" && < OtherWorkEntry/>}
             {currentPage === "departments" && < DepartmentForm/>}
             {currentPage === "ready-product" && < ReadyProductEntry/>}
             {currentPage === "sale" && < SaleEntry/>}
             {currentPage === "sales-orders" && <SalesOrders />}
             {currentPage === "delivery-challans" && <DeliveryChallans />}
             {currentPage === "invoices" && <Invoices />}
             {currentPage === "expense" && < ExpensePro/>}
             {currentPage === "payroll" && < PayrollEntry/>}
             {currentPage === "accounts" && < AccountsOverview/>}
             {currentPage === "warehouses" && < WarehousePage/>}
             {currentPage === "reports" && < ReportsDashboard/>}
             {currentPage === "settings" && < SettingsPro/>}
              {currentPage === "production-items" && < ProductionItemsManager/>}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;