// src/components/MainLayout.js
import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = ({ children, onLogout, toggleTheme, theme  }) => {
const navigate = useNavigate();
   const handleLogout = () => {
        if (onLogout) {
            onLogout(); // clear token
        }
        navigate("/login"); // redirect to login page
    };
    return (
        <div className="app-container">
            <Sidebar />
            <div className="main-content">
                <Topbar onLogout={handleLogout}  toggleTheme={toggleTheme} theme={theme}/>
                <main>{children}</main>
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
