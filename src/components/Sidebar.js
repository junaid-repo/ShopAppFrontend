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

const Sidebar = ({ isCollapsed = false, toggleSidebar }) => {
    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px' }}>
                {/* Hamburger placed beside logo */}
                <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="sidebar-toggle-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '22px', height: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <span style={{ display: 'block', height: '2px', background: 'var(--text-color)', borderRadius: '2px', opacity: 0.9 }} />
                        <span style={{ display: 'block', height: '2px', background: 'var(--text-color)', borderRadius: '2px', opacity: 0.7 }} />
                        <span style={{ display: 'block', height: '2px', background: 'var(--text-color)', borderRadius: '2px', opacity: 0.5 }} />
                    </div>
                </button>
                <h1 className="logo">{isCollapsed ? '' : 'ShopFlow'}</h1>
            </div>
            <nav className="sidebar-nav">

                <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <DashboardIcon style={{ color: iconColors.dashboard }} />
                    <span className="nav-text">Dashboard</span>
                </NavLink>

                <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <Inventory2Icon style={{ color: iconColors.products }} />
                    <span className="nav-text">Products</span>
                </NavLink>

                <NavLink to="/sales" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <ShoppingCartIcon style={{ color: iconColors.sales }} />
                    <span className="nav-text">Sales</span>
                </NavLink>

                <NavLink to="/billing" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <ReceiptIcon style={{ color: iconColors.billing }} />
                    <span className="nav-text">Billing</span>
                </NavLink>

                <NavLink to="/customers" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <PeopleIcon style={{ color: iconColors.customers }} />
                    <span className="nav-text">Customers</span>
                </NavLink>

                <NavLink to="/payments" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <CreditCardIcon style={{ color: iconColors.payments }} />
                    <span className="nav-text">Payments</span>
                </NavLink>

                <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <TableChartIcon style={{ color: iconColors.reports }} />
                    <span className="nav-text">Reports</span>
                </NavLink>

                <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <BarChartIcon style={{ color: iconColors.analytics }} />
                    <span className="nav-text">Analytics</span>
                </NavLink>

            </nav>
        </aside>
    );
};

export default Sidebar;
