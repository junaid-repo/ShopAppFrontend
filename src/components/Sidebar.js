// src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';

// ✅ Import Material Design Icons (from MUI)
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';

import './Sidebar.css';

// 🎨 Assign static colors for each icon
const iconColors = {
  dashboard: "#FF6B6B",   // red
  products: "#4ECDC4",    // teal
  sales: "#45B7D1",       // blue
  billing: "#FFA600",     // orange
  customers: "#9B5DE5",   // purple
  payments: "#06D6A0",    // green
  reports: "#FFD93D",     // yellow
  analytics: "#F15BB5"    // pink
};

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="logo">ShopFlow</h1>
            </div>
            <nav className="sidebar-nav">

                <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <DashboardIcon style={{ color: iconColors.dashboard }} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <Inventory2Icon style={{ color: iconColors.products }} />
                    <span>Products</span>
                </NavLink>

                <NavLink to="/sales" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <ShoppingCartIcon style={{ color: iconColors.sales }} />
                    <span>Sales</span>
                </NavLink>

                <NavLink to="/billing" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <ReceiptIcon style={{ color: iconColors.billing }} />
                    <span>Billing</span>
                </NavLink>

                <NavLink to="/customers" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <PeopleIcon style={{ color: iconColors.customers }} />
                    <span>Customers</span>
                </NavLink>

                <NavLink to="/payments" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <CreditCardIcon style={{ color: iconColors.payments }} />
                    <span>Payments</span>
                </NavLink>

                <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <TableChartIcon style={{ color: iconColors.reports }} />
                    <span>Reports</span>
                </NavLink>

                <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <BarChartIcon style={{ color: iconColors.analytics }} />
                    <span>Analytics</span>
                </NavLink>

            </nav>
        </aside>
    );
};

export default Sidebar;
