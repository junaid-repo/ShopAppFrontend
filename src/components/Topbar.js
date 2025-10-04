// src/components/Topbar.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Moon,
    Sun,
    UserCircle,
    SignOut,
} from "@phosphor-icons/react";
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

    // Fetch user profile + pic
    useEffect(() => {
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

    // Fetch unseen notifications
    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/unseen`, {
                credentials: "include",
            });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnseenCount(data.count || 0);
        } catch {}
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    // Logout
    const handleLogout = async () => {
        if (!window.confirm("Do you really want to log out?")) return;
        onLogout();
        await fetch(`${apiUrl}/api/user/logout`, {
            method: "POST",
            credentials: "include",
        });
        navigate("/login", { replace: true });
    };

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };
    // Fetch unseen notifications
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

    // Close dropdown on outside click
    useEffect(() => {
        if (!notifDropdownOpen) return;
        const handleClick = (e) => {
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen]);

    // Clear notifications (mark all as seen)
    const handleClearNotifications = async (e) => {
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

    // Handle notification icon click
    const handleNotifClick = () => {
        setNotifDropdownOpen(false);
        if (setSelectedPage) {
            setSelectedPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

    return (
        <header
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
                className="glass-card2"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    padding: "0.4rem 1.2rem",
                    marginTop: "0rem",
                    borderRadius: "26px",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                }}
            >
                {/* 🔔 Notifications */}
                <div
                    ref={notifDropdownRef}
                    style={{ position: "relative", cursor: "pointer" }}
                    onMouseEnter={() => setNotifDropdownOpen(true)}
                    onMouseLeave={() => setNotifDropdownOpen(false)}
                    onClick={() => setSelectedPage('notifications')}
                >
                    <Bell size={28} weight="duotone" />
                    {unseenCount > 0 && (
                        <span
                            style={{
                                position: "absolute",
                                top: "-4px",
                                right: "-6px",
                                background: "#e80a0d",
                                color: "#fff",
                                borderRadius: "50%",
                                fontSize: "0.75rem",
                                width: "17px",
                                height: "17px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
              {unseenCount}
            </span>
                    )}
                    {notifDropdownOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '38px',
                                right: 0,
                                minWidth: '320px',
                                background: 'var(--modal-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '5%',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.15)', // stronger dropdown depth
                                zIndex: 100,
                                padding: '0.5rem 0',
                                transition: 'transform 0.2s, opacity 0.2s',
                                transform: 'translateY(0)',
                                opacity: 1,
                            }}
                            onMouseEnter={() => setNotifDropdownHover(true)}
                            onMouseLeave={() => { setNotifDropdownHover(false); setNotifDropdownOpen(false); }}
                        >
                            <div style={{ padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--primary-color)' }}>Notifications</div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '0.75rem 1rem', color: '#888' }}>No new notifications.</div>
                            ) : (
                                notifications.slice(0, 5).map(n => (
                                    <div key={n.id} style={{
                                        padding: '0.5rem 1rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: n.seen ? 'transparent' : 'rgba(0,170,255,0.08)',
                                        //  color: n.seen ? 'var(--text-color)' : '#103784',
                                        fontWeight: n.seen ? 400 : 600,
                                        cursor: 'pointer',
                                        boxShadow: n.seen ? 'none' : '0 1px 6px rgba(0,0,0,0.08)', // subtle depth for unread
                                        borderRadius: '0%',
                                        marginBottom: '2px',
                                        transition: 'background 0.2s, transform 0.2s',
                                    }}
                                         onClick={() => {
                                             setNotifDropdownOpen(false);
                                             navigate('/notifications');
                                         }}
                                         onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                                         onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                    >
                                        <div style={{ fontSize: '1rem', fontWeight: "bold" }}>{n.title}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{n.subject}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2, paddingLeft: "170px"}}>{getRelativeTime(n.createdAt)}</div>
                                    </div>
                                ))
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem' }}>
                                <button className="btn btn-cancel" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }} onClick={handleClearNotifications}>Clear</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🌙 / ☀️ Theme Toggle */}
                <div onClick={toggleTheme} style={{ cursor: "pointer" }}>
                    {theme === "light" ? (
                        <Moon size={28} weight="duotone" />
                    ) : (
                        <Sun size={28} weight="duotone" />
                    )}
                </div>

                {/* 👤 User Info */}
                <div
                    onClick={() => setSelectedPage("profile")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                        padding: "6px 12px",
                        borderRadius: "999px", // pill shape
                        border: "1px solid rgba(200, 200, 200, 0.5)", // simple soft border
                    }}
                >
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile"
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                objectFit: "cover",
                            }}
                        />
                    ) : (
                        <UserCircle size={32} weight="duotone" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>
    {userName || "Guest"}
  </span>
                </div>


                {/* 🚪 Logout */}
                <div
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background:
                            "linear-gradient(135deg, rgba(232,10,13,0.35), rgba(232,10,13,0.15))",
                        border: "1px solid rgba(232,10,13,0.4)",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "12px",
                        color: "#6f3838",
                        cursor: "pointer",
                        transition: "0.3s",
                        fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                            "linear-gradient(135deg, rgba(232,10,13,0.5), rgba(232,10,13,0.25))")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                            "linear-gradient(135deg, rgba(232,10,13,0.35), rgba(232,10,13,0.15))")
                    }
                >
                    <SignOut size={20} weight="duotone" />
                </div>
            </div>
        </header>
    );
};

export default Topbar;
