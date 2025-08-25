// src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaBoxOpen, FaShoppingCart, FaUsers, FaCreditCard, FaFileInvoiceDollar, FaChartBar } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                 {/*  */}
                <h1 className="logo">ShopFlow</h1>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaTachometerAlt /><span>Dashboard</span>
                </NavLink>
                <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaBoxOpen /><span>Products</span>
                </NavLink>
                <NavLink to="/sales" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaShoppingCart /><span>Sales</span>
                </NavLink>
                <NavLink to="/billing" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaFileInvoiceDollar /><span>Billing</span>
                </NavLink>
                <NavLink to="/customers" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaUsers /><span>Customers</span>
                </NavLink>
                <NavLink to="/payments" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                    <FaCreditCard /><span>Payments</span>
                </NavLink>
                                <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                                    <FaChartBar /><span>Reports</span>
                                </NavLink>
            </nav>
        </aside>
    );
};

export default Sidebar;