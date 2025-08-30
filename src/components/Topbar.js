// src/components/Topbar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "../pages/ConfigProvider";

// Make sure to pass `theme` and `toggleTheme` from MainLayout.js
const Topbar = ({ onLogout, theme, toggleTheme, toggleSidebar, isCollapsed }) => {
    const [userName, setUserName] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const navigate = useNavigate();
    const config = useConfig();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');

        (async () => {
            try {
                if (token) {
                    const decoded = jwtDecode(token);
                    const username = decoded.sub;
                    setUserName(username);

                    const res = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (res.ok) {
                        const arrayBuffer = await res.arrayBuffer();
                        const blob = new Blob([arrayBuffer]);
                        const imageUrl = URL.createObjectURL(blob);
                        setProfilePic(imageUrl);
                    } else {
                        console.error('Failed to fetch profile picture:', res.statusText);
                    }
                }
            } catch (err) {
                console.error('Failed to load profile pic', err);
            }
        })();
    }, [apiUrl]); // Added apiUrl as a dependency

    const handleProfileClick = () => {
        navigate('/profile');
    };

    const handleLogout = () => {

        const confirmDownload = window.confirm("Do you really want to log out?");
        if (!confirmDownload) {
            return;
        }

        onLogout();
        navigate("/login", { replace: true });
    };

    return (
        <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem' }}>
            {/* Left: search (sidebar toggle is in Sidebar header) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                    type="text"
                    placeholder="Search..."
                    className="search-bar"
                    style={{ width: '420px' }}
                />
            </div>

            {/* Controls: Theme Toggle, User Profile + Logout */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>

                {/* Theme Toggle Button */}
                <button
                    onClick={() => {
                        console.log("clicked! theme before:", theme);
                        toggleTheme();
                    }}
                    style={{
                        width: "70px",
                        height: "36px",
                        borderRadius: "25px",
                        border: "2px solid #00aaff", // Primary color border
                        background: theme === "light" ? "#f0faff" : "#002b36",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: theme === "light" ? "flex-start" : "flex-end",
                        padding: "4px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 10px rgba(0, 170, 255, 0.3)", // subtle glow
                    }}
                >
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: theme === "light" ? "#ffcc00" : "#00aaff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "14px",
                            transition: "all 0.3s ease",
                        }}
                    >
                        {theme === "light" ? <FaMoon /> : <FaSun />}
                    </div>
                </button>




                {/* User Profile */}
                <div
                    onClick={handleProfileClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '50px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 2px 8px var(--shadow-color)',
                        cursor: 'pointer'
                    }}
                >
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile"
                            style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--primary-color)'
                            }}
                        />
                    ) : (
                        <FaUserCircle size={50} color="var(--primary-color)" />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-color)',
                            opacity: 0.8,
                            marginBottom: '2px'
                        }}>
                            Logged in as
                        </span>
                        <span style={{
                            fontWeight: 600,
                            color: 'var(--text-color)',
                            whiteSpace: 'nowrap'
                        }}>
                            {userName || 'Guest'}
                        </span>
                    </div>
                </div>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    className="btn" // still keeps your global btn styles
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#e80a0d",
                        boxShadow: "0 6px 10px rgba(255, 107, 107, 0.3)",
                        padding: "11px 15px",   // 🔹 smaller padding
                        fontSize: "0.85rem",   // 🔹 slightly smaller text
                        borderRadius: "25px",   // 🔹 keep rounded look
                        cursor: "pointer",
                    }}
                >
                    <FaSignOutAlt style={{ fontSize: "0.9rem" }} /> Logout
                </button>

            </div>
        </header>
    );
};

export default Topbar;
