// src/components/MainLayout.js
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";

const MainLayout = ({ children, onLogout, toggleTheme, theme, selectedPage, setSelectedPage, pages  }) => {
const navigate = useNavigate();
    // sidebar collapsed state (persist in localStorage)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            const s = localStorage.getItem('sidebar_collapsed');
            return s === 'true';
        } catch (e) {
            return false;
        }
    });
    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar_collapsed', String(next)); } catch (e) {}
            return next;
        });
    };
    // if storage changed elsewhere, keep it in sync
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'sidebar_collapsed') {
                try { setIsCollapsed(e.newValue === 'true'); } catch (err) {}
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);
   const handleLogout = () => {
        if (onLogout) {
            onLogout(); // clear token
        }
        navigate("/login"); // redirect to login page
    };
    return (
        <div className={`app-container ${isCollapsed ? 'collapsed' : ''}`}>
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
            <div className="main-content">
                <Topbar onLogout={handleLogout}  toggleTheme={toggleTheme} theme={theme} isCollapsed={isCollapsed} setSelectedPage={setSelectedPage} />
                <main>{(pages && selectedPage && pages[selectedPage]) ? pages[selectedPage] : children}</main>
                <Footer setSelectedPage={setSelectedPage} />
            </div>
        </div>
    );
};

export default MainLayout;


/*
const MainLayout = ({ children, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        if (onLogout) {
            onLogout(); // clear token
        }
        navigate("/login"); // redirect to login page
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            <Sidebar />
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {*//* ✅ Pass the wrapped logout *//*}
                <Topbar onLogout={handleLogout} />
                <main style={{ flex: 1, padding: "20px" }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;*/
