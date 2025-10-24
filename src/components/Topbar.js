// src/components/Topbar.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Moon,
    Sun,
    UserCircle,
    SignOut,
    User,        // <-- Added for dropdown
    Gear,        // <-- Added for dropdown
} from "@phosphor-icons/react";
import "./Topbar.css"
import { useConfig } from "../pages/ConfigProvider";

const Topbar = ({ onLogout, theme, toggleTheme, setSelectedPage }) => {
    const [userName, setUserName] = useState("");
    const [profilePic, setProfilePic] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const notifDropdownRef = useRef(null);
    const navigate = useNavigate();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const [notifDropdownHover, setNotifDropdownHover] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isLogoutHovered, setIsLogoutHovered] = useState(false);
    const [isThemeHovered, setIsThemeHovered] = useState(false);
    const [isNotiHovered, setIsNotiHovered] = useState(false);

    // --- NEW: State for user dropdown ---
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef(null); // Ref for the user dropdown

    // Fetch user profile + pic
    useEffect(() => {
        // ... (existing profile fetch logic - no changes needed here)
        (async () => {
            try {
                const res = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    credentials: "include",
                });
                if (!res.ok) return;
                const data = await res.json();
                setUserName(data.username || "");

                const picRes = await fetch(
                    `${apiUrl}/api/shop/user/${data.username}/profile-pic`,
                    { credentials: "include" }
                );
                if (picRes.ok) {
                    const blob = new Blob([await picRes.arrayBuffer()]);
                    setProfilePic(URL.createObjectURL(blob));
                }
            } catch (err) {
                console.error("Profile fetch failed", err);
            }
        })();
    }, [apiUrl]);

    // Fetch unseen notifications (using the combined function)
    const fetchUnseenNotifications = async () => {
        if (!apiUrl) return;
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/unseen`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnseenCount(data.count || 0);
        } catch (err) {
            // Optionally handle error
        }
    };

    // Poll for notifications every 30s
    useEffect(() => {
        fetchUnseenNotifications();
        const interval = setInterval(fetchUnseenNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    // Close dropdowns on outside click (combined logic)
    useEffect(() => {
        const handleClick = (e) => {
            if (notifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
            // --- NEW: Close user dropdown on outside click ---
            if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen, isUserDropdownOpen]); // Depend on both dropdown states

    // Logout (no changes needed)
    const handleLogout = async () => {
        if (!window.confirm("Do you really want to log out?")) return;
        onLogout();
        await fetch(`${apiUrl}/api/user/logout`, {
            method: "POST",
            credentials: "include",
        });
        localStorage.removeItem('theme');
        navigate("/login", { replace: true });
    };

    const getRelativeTime = (dateString) => {
        // ... (existing time logic - no changes)
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };


    // Clear notifications (mark all as seen)
    const handleClearNotifications = async (e) => {
        // ... (existing logic - no changes)
        e.stopPropagation();
        try {
            await fetch(`${apiUrl}/api/shop/notifications/clear`, {
                method: 'POST',
                credentials: 'include',
            });
            setUnseenCount(0);
            setNotifications([]);
        } catch (err) {}
    };

    // Handle notification icon click (Navigate to notifications page)
    const handleNotifClick = () => {
        // ... (existing logic - no changes)
        setNotifDropdownOpen(false);
        if (setSelectedPage) {
            setSelectedPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

    return (<header
        className="topbar"
        style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            position: "relative",
            zIndex: 1000, // keeps dropdown above content
        }}
    >
        {/* 🔘 Button Container */}
        <div
            className="glass-card2 topbar-buttons-container" // Added class for easier CSS targeting
        >
            {/* 🔔 Notifications */}
            <div
                ref={notifDropdownRef}
                className="topbar-icon-wrapper" // Added class
                style={{position: 'relative'}} // Needed for badge positioning
                onMouseEnter={() => {
                    setIsNotiHovered(true);
                    setNotifDropdownOpen(true);
                }}
                onMouseLeave={() => {
                    // Use a small delay to allow moving to the dropdown
                    setTimeout(() => {
                        if (!notifDropdownHover) {
                            setIsNotiHovered(false);
                            setNotifDropdownOpen(false);
                        }
                    }, 600);
                }}
                onClick={handleNotifClick} // Navigate on click
            >
                {/*<Bell size={28} weight="duotone" />*/}
                <Bell size={28} weight="duotone" />
                {unseenCount > 0 && (
                    <span className="notification-badge">
                        {unseenCount}
                    </span>
                )}
                {/* Notification Dropdown */}
                {notifDropdownOpen && (
                    <div
                        className="notification-dropdown" // Added class
                        onMouseEnter={() => setNotifDropdownHover(true)}
                        onMouseLeave={() => {
                            setNotifDropdownHover(false);
                            setNotifDropdownOpen(false);
                        }}
                    >
                        <div className="notification-dropdown-header">Notifications</div>
                        {notifications.length === 0 ? (
                            <div className="notification-dropdown-empty">No new notifications.</div>
                        ) : (
                            notifications.slice(0, 5).map(n => (
                                <div key={n.id}
                                     className={`notification-dropdown-item ${!n.seen ? 'unread' : ''}`}
                                     onClick={(e) => { // Allow clicking item to navigate
                                         e.stopPropagation(); // Prevent parent onClick
                                         handleNotifClick();
                                     }}
                                >
                                    <div className="notification-title">{n.title}</div>
                                    <div className="notification-subject">{n.subject}</div>
                                    <div className="notification-time">{getRelativeTime(n.createdAt)}</div>
                                </div>
                            ))
                        )}
                        <div className="notification-dropdown-actions">
                            <button className="btn btn-clear-notif" onClick={handleClearNotifications}>Clear</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 🌙 / ☀️ Theme Toggle */}
            <div
                className="topbar-icon-wrapper" // Added class
                onClick={toggleTheme}
                onMouseEnter={() => setIsThemeHovered(true)}
                onMouseLeave={() => setIsThemeHovered(false)}
                style={{ transform: isThemeHovered ? "translateY(-5px)" : "translateY(0)"}} // Keep hover effect inline for simplicity
            >
                {theme === "light" ? (
                    <Moon size={28} weight="duotone" />
                ) : (
                    <Sun size={28} weight="duotone" />
                )}
            </div>

            {/* --- MODIFIED: 👤 User Info Wrapper for Dropdown --- */}
            <div
                ref={userDropdownRef} // Add ref to the wrapper
                className="user-profile-wrapper" // New wrapper class
                style={{ position: 'relative' }} // Needed for dropdown positioning
                onMouseEnter={() => {
                    clearTimeout(window.userDropdownTimeout);
                    setIsUserDropdownOpen(true);
                }}
                onMouseLeave={() => {
                    window.userDropdownTimeout = setTimeout(() => {
                        setIsUserDropdownOpen(false);
                    }, 300); // <-- Adjust delay (300ms is good)
                }}
            >
                {/* Original User Info Div (can still be clicked) */}
                <div
                    className="user-profile-trigger" // New class for trigger
                    onClick={() => setSelectedPage("profile")} // Keep direct click functional
                    onMouseEnter={() => setIsHovered(true)}    // Keep individual hover effect
                    onMouseLeave={() => setIsHovered(false)}   // Keep individual hover effect
                    style={{ transform: isHovered ? "translateY(-5px)" : "translateY(0)" }} // Keep hover effect inline
                >
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile"
                            className="user-profile-pic" // Added class
                        />
                    ) : (
                        <UserCircle
                            size={36} // Slightly larger icon if no pic
                            weight="duotone"
                        />
                    )}
                    <span className="user-profile-name">
                        {userName || "Guest"}
                    </span>
                </div>

                {/* --- NEW: User Dropdown --- */}
                {isUserDropdownOpen && (
                    <div
                        className="user-dropdown"
                        onMouseEnter={() => {
                            clearTimeout(window.userDropdownTimeout);
                            setIsUserDropdownOpen(true);
                        }}
                        onMouseLeave={() => {
                            window.userDropdownTimeout = setTimeout(() => {
                                setIsUserDropdownOpen(false);
                            }, 300);
                        }}
                        style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            background: "var(--background-color)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            borderRadius: "25px",
                            marginTop: "6px",
                            padding: "8px 0",
                            zIndex: 2000,
                            minWidth: "250px",
                            transition: "opacity 0.2s ease-in-out",
                        }}
                    >

                    {/* Shop and Profile Item */}
                        <div
                            className="user-dropdown-item"
                            onClick={() => {
                                setSelectedPage("profile");
                                setIsUserDropdownOpen(false); // Close on click
                            }}
                        >
                            <i className="fa-duotone fa-thin fa-user" style={{fontSize:"22px"}}></i>
                            <span>Shop and Profile</span>
                        </div>

                        {/* Settings Item */}
                        <div
                            className="user-dropdown-item"
                            onClick={() => {
                                setSelectedPage("settings");
                                setIsUserDropdownOpen(false); // Close on click
                            }}
                        >
                            <i className="fa-duotone fa-regular fa-gear" style={{fontSize:"22px"}}></i>
                            <span>Settings</span>
                        </div>

                        {/* Logout Item */}
                        <div
                            className="user-dropdown-item logout" // Added 'logout' class for specific styling if needed
                            onClick={() => {
                                handleLogout();
                                setIsUserDropdownOpen(false); // Close on click
                            }}
                        >
                            <i className="fa-duotone fa-regular fa-right-from-bracket" style={{fontSize:"22px", color:"#e80a0d"}}></i>

                            <span>Logout</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODIFIED: 🚪 Logout Button (Now part of dropdown, keep original structure/styles if needed elsewhere) --- */}
            {/* This button is now redundant if the dropdown is always used, but kept for structure reference */}
            {/* You might want to remove this outer logout button entirely */}
            {/*
            <div
                className="topbar-icon-wrapper logout-button-wrapper" // Added class
                onClick={handleLogout}
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
                style={{ transform: isLogoutHovered ? "translateY(-5px)" : "translateY(0)" }}
            >
                <SignOut
                    size={28}
                    weight="duotone"
                    color="#e80a0d"
                />
            </div>
             */}
        </div>
    </header>);
};

export default Topbar;