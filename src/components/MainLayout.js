// src/components/MainLayout.js
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = ({ children }) => {
    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Topbar />
                <main>{children}</main>
            </div>
        </div>
    );
};

export default MainLayout;