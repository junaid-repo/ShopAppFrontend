// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Gauge, UsersFour, Invoice , Archive, ChartLineUp, MicrosoftExcelLogo, ShoppingCart, CreditCard, Receipt, Headset } from "@phosphor-icons/react";
// 👆 Added `Headset` icon for chat support

import './Sidebar.css';

const iconColors = {
    dashboard: "#353aad",
    products: "#353aad",
    sales: "#353aad",
    billing: "#353aad",
    customers: "#353aad",
    payments: "#353aad",
    reports: "#353aad",
    analytics: "#353aad",
    chat: "#353aad"
};

const Sidebar = ({ isCollapsed = false, toggleSidebar, selectedPage, setSelectedPage }) => {
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.body.classList.contains('dark-theme')
    );

    const [primaryColor, setPrimaryColor] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            return val ? val.trim() : '#00aaff';
        } catch (e) {
            return '#00aaff';
        }
    });

    useEffect(() => {
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
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}
        const storageHandler = (e) => {
            if (e.key === 'theme' || e.key === 'sidebar_collapsed') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    const collapsedIconColor = isDark ? '#ffffff' : '#353aad' || '#00aaff';
    const toggleColor = collapsedIconColor;

    const makeClickHandler = (page) => (e) => {
        e.preventDefault();
        if (setSelectedPage) setSelectedPage(page);
    };

    const navButtonBaseStyle = {
        border: 'none',
        width: '100%',
        textAlign: 'left',
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        borderRadius: '50px'
    };

    const buttonStyleFor = (page) => {
        if (selectedPage === page) return navButtonBaseStyle;
        return { ...navButtonBaseStyle, background: 'transparent' };
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div
                className="sidebar-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '8px'
                }}
            >
                <button
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                    className="sidebar-toggle-btn"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div
                        style={{
                            width: '22px',
                            height: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
            <span
                style={{
                    display: 'block',
                    height: '2px',
                    background: toggleColor,
                    borderRadius: '2px',
                    opacity: 0.95
                }}
            />
                        <span
                            style={{
                                display: 'block',
                                height: '2px',
                                background: toggleColor,
                                borderRadius: '2px',
                                opacity: 0.85
                            }}
                        />
                        <span
                            style={{
                                display: 'block',
                                height: '2px',
                                background: toggleColor,
                                borderRadius: '2px',
                                opacity: 0.75
                            }}
                        />
                    </div>
                </button>
                <h1 className="logo">{isCollapsed ? '' : 'Clear Bill'}</h1>
            </div>

            {/* Sidebar Main Navigation */}
            <nav className="sidebar-nav">
                <button
                    type="button"
                    onClick={makeClickHandler('dashboard')}
                    className={`nav-link ${selectedPage === 'dashboard' ? 'active' : ''}`}
                    title="Dashboard"
                    style={buttonStyleFor('dashboard')}
                >
                    <Gauge
                        weight="duotone"
                        style={{
                            color: isDark
                                ? '#ffffff'
                                : iconColors.dashboard
                        }}
                    />
                    <span className="nav-text">Dashboard</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('products')}
                    className={`nav-link ${selectedPage === 'products' ? 'active' : ''}`}
                    title="Products"
                    style={buttonStyleFor('products')}
                >
                    <Archive weight="duotone" style={{ color: iconColors.products }} />
                    <span className="nav-text">Products</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('sales')}
                    className={`nav-link ${selectedPage === 'sales' ? 'active' : ''}`}
                    title="Sales"
                    style={buttonStyleFor('sales')}
                >
                    <ShoppingCart weight="duotone" style={{ color: iconColors.sales }} />
                    <span className="nav-text">Sales</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('billing2')}
                    className={`nav-link ${selectedPage === 'billing2' ? 'active' : ''}`}
                    title="GSTBilling"
                    style={buttonStyleFor('billing2')}
                >
                    <Receipt weight="duotone" style={{ color: iconColors.billing }} />
                    <span className="nav-text">GSTBilling</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('customers')}
                    className={`nav-link ${selectedPage === 'customers' ? 'active' : ''}`}
                    title="Customers"
                    style={buttonStyleFor('customers')}
                >
                    <UsersFour weight="duotone" style={{ color: iconColors.customers }} />
                    <span className="nav-text">Customers</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('payments')}
                    className={`nav-link ${selectedPage === 'payments' ? 'active' : ''}`}
                    title="Payments"
                    style={buttonStyleFor('payments')}
                >
                    <CreditCard weight="duotone" style={{ color: iconColors.payments }} />
                    <span className="nav-text">Payments</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('reports')}
                    className={`nav-link ${selectedPage === 'reports' ? 'active' : ''}`}
                    title="Reports"
                    style={buttonStyleFor('reports')}
                >
                    <MicrosoftExcelLogo weight="duotone" style={{ color: iconColors.reports }} />
                    <span className="nav-text">Reports</span>
                </button>

                <button
                    type="button"
                    onClick={makeClickHandler('analytics')}
                    className={`nav-link ${selectedPage === 'analytics' ? 'active' : ''}`}
                    title="Analytics"
                    style={buttonStyleFor('analytics')}
                >
                    <ChartLineUp weight="duotone" style={{ color: iconColors.analytics }} />
                    <span className="nav-text">Analytics</span>
                </button>
            </nav>

            {/* 🟢 Chat Support Button — Distinct + Left Corner */}
            <div className="sidebar-chat-button">
                <button
                    type="button"
                    onClick={makeClickHandler('chat')}
                    className={`nav-link chat-support ${selectedPage === 'chat' ? 'active' : ''}`}
                    title="Chat Support"
                >
                    <Headset size={20} weight="duotone" style={{ marginRight: '8px' }} />
                    <span className="chat-text">Chat Support</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
