// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
// import { NavLink } from 'react-router-dom';

// ✅ Import Material Design Icons (from MUI)
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Gauge, UsersFour, Invoice , Archive, ChartLineUp, MicrosoftExcelLogo, ShoppingCart, CreditCard, Receipt} from "@phosphor-icons/react";

import './Sidebar.css';

// 🎨 Assign static colors for each icon
const iconColors = {
  dashboard: "#353aad",   // red
  products: "#353aad",    // teal
  sales: "#353aad",       // blue
  billing: "#353aad",     // orange
  customers: "#353aad",   // purple
  payments: "#353aad",    // green
  reports: "#353aad",     // yellow
  analytics: "#353aad"    // pink
};

const Sidebar = ({ isCollapsed = false, toggleSidebar, selectedPage, setSelectedPage }) => {
    const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.body.classList.contains('dark-theme'));
    const [primaryColor, setPrimaryColor] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            return val ? val.trim() : '#00aaff';
        } catch (e) {
            return '#00aaff';
        }
    });

    useEffect(() => {
        // updater reads current body class and css var
        const update = () => {
            try {
                setIsDark(document.body.classList.contains('dark-theme'));
            } catch (e) {}
            try {
                const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
                if (val) setPrimaryColor(val.trim());
            } catch (e) {}
        };

        update();

        // observe body class changes
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}

        // also listen to storage (theme saved in localStorage by App)
        const storageHandler = (e) => {
            if (e.key === 'theme' || e.key === 'sidebar_collapsed') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    // color to use for icons when sidebar is collapsed: primary in light, white in dark
    const collapsedIconColor = isDark ? '#ffffff' : '#353aad' || '#00aaff';
    const toggleColor = collapsedIconColor;

    const makeClickHandler = (page) => (e) => {
        e.preventDefault();
        if (setSelectedPage) setSelectedPage(page);
    };

    // keep button base style but avoid setting background inline (so CSS .nav-link.active can take effect)
    // IMPORTANT: do NOT set `background` inline here — inline backgrounds override stylesheet rules.
    const navButtonBaseStyle = { border: 'none', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', marginBottom: '0.5rem', borderRadius: '50px' };

    const buttonStyleFor = (page) => {
        // For non-active buttons we explicitly set a transparent background to override the browser default
        // For the active button we must NOT set background so the stylesheet (.sidebar .nav-link.active) can apply
        if (selectedPage === page) return navButtonBaseStyle;
        return { ...navButtonBaseStyle, background: 'transparent' };
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '8px' }}>
                {/* Hamburger placed beside logo */}
                <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="sidebar-toggle-btn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '22px', height: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <span style={{ display: 'block', height: '2px', background: toggleColor, borderRadius: '2px', opacity: 0.95 }} />
                        <span style={{ display: 'block', height: '2px', background: toggleColor, borderRadius: '2px', opacity: 0.85 }} />
                        <span style={{ display: 'block', height: '2px', background: toggleColor, borderRadius: '2px', opacity: 0.75 }} />
                    </div>
                </button>
                <h1 className="logo">{isCollapsed ? '' : 'Clear Bill'}</h1>
            </div>
            <nav className="sidebar-nav">

                <button type="button" onClick={makeClickHandler('dashboard')} className={`nav-link ${selectedPage === 'dashboard' ? 'active' : ''}`} title="Dashboard" style={buttonStyleFor('dashboard')}>
                    <Gauge weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'dashboard' ? '#ffffff' : collapsedIconColor) : iconColors.dashboard) }} />
                    <span className="nav-text">Dashboard</span>
                </button>

                <button type="button" onClick={makeClickHandler('products')} className={`nav-link ${selectedPage === 'products' ? 'active' : ''}`} title="Products" style={buttonStyleFor('products')}>
                    <Archive weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'products' ? '#ffffff' : collapsedIconColor) : iconColors.products) }} />
                    <span className="nav-text">Products</span>
                </button>

                <button type="button" onClick={makeClickHandler('sales')} className={`nav-link ${selectedPage === 'sales' ? 'active' : ''}`} title="Sales" style={buttonStyleFor('sales')}>
                    <ShoppingCart weight="duotone"  style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'sales' ? '#ffffff' : collapsedIconColor) : iconColors.sales) }} />
                    <span className="nav-text">Sales</span>
                </button>

                <button type="button" onClick={makeClickHandler('billing')} className={`nav-link ${selectedPage === 'billing' ? 'active' : ''}`} title="Billing" style={buttonStyleFor('billing')}>
                    <Receipt weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'billing' ? '#ffffff' : collapsedIconColor) : iconColors.billing) }} />
                    <span className="nav-text">Billing</span>
                </button>

                <button type="button" onClick={makeClickHandler('customers')} className={`nav-link ${selectedPage === 'customers' ? 'active' : ''}`} title="Customers" style={buttonStyleFor('customers')}>
                    <UsersFour weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'customers' ? '#ffffff' : collapsedIconColor) : iconColors.customers) }} />
                    <span className="nav-text">Customers</span>
                </button>

                <button type="button" onClick={makeClickHandler('payments')} className={`nav-link ${selectedPage === 'payments' ? 'active' : ''}`} title="Payments" style={buttonStyleFor('payments')}>
                    <CreditCard weight="duotone"  style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'payments' ? '#ffffff' : collapsedIconColor) : iconColors.payments) }} />
                    <span className="nav-text">Payments</span>
                </button>

                <button type="button" onClick={makeClickHandler('reports')} className={`nav-link ${selectedPage === 'reports' ? 'active' : ''}`} title="Reports" style={buttonStyleFor('reports')}>
                    <MicrosoftExcelLogo weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'reports' ? '#ffffff' : collapsedIconColor) : iconColors.reports) }} />
                    <span className="nav-text">Reports</span>
                </button>

                <button type="button" onClick={makeClickHandler('analytics')} className={`nav-link ${selectedPage === 'analytics' ? 'active' : ''}`} title="Analytics" style={buttonStyleFor('analytics')}>
                    <ChartLineUp  weight="duotone" style={{ color: isDark ? '#ffffff' : (isCollapsed ? (selectedPage === 'analytics' ? '#ffffff' : collapsedIconColor) : iconColors.analytics) }} />
                    <span className="nav-text">Analytics</span>
                </button>

            </nav>
        </aside>
    );
};

export default Sidebar;
