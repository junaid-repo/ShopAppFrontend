// src/components/Topbar.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Moon,
    Sun,
    UserCircle,
    SignOut,
    User,
    Gear,
} from "@phosphor-icons/react";
import "./Topbar.css"
import { useConfig } from "../pages/ConfigProvider";
import { useSearchKey } from "../context/SearchKeyContext";

// --- Debounce Hook (Existing) ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};


// 1. ADD 'isCollapsed' and 'toggleSidebar' to the props
const Topbar = ({ onLogout, theme, toggleTheme, setSelectedPage, isCollapsed, toggleSidebar }) => {
    // --- Original State (Existing) ---
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
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef(null);

    // --- Global Search State (Existing) ---
    const { setSearchKey } = useSearchKey();
    const [globalSearchTerm, setGlobalSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const debouncedSearchTerm = useDebounce(globalSearchTerm, 300);
    const searchDropdownRef = useRef(null);

    // 2. --- NEW: Logic copied from Sidebar.js to color the toggle button ---
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.body.classList.contains('dark-theme')
    );

    useEffect(() => {
        const update = () => {
            try {
                setIsDark(document.body.classList.contains('dark-theme'));
            } catch (e) {}
        };
        update();
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}

        // Also listen for storage changes (if theme is toggled in another tab)
        const storageHandler = (e) => {
            if (e.key === 'theme') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    // Use the exact color logic from your Sidebar.js
    const collapsedIconColor = isDark ? '#ffffff' : '#353aad' || '#00aaff';
    const toggleColor = collapsedIconColor;
    // --- END OF NEW LOGIC ---


    // --- Original useEffect (Profile Fetch) ---
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

    // --- Original fetchUnseenNotifications ---
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

    // --- Original useEffect (Notification Poll) ---
    useEffect(() => {
        fetchUnseenNotifications();
        const interval = setInterval(fetchUnseenNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);


    // --- Original useEffect (Search Fetch) ---
    useEffect(() => {
        if (!debouncedSearchTerm) {
            setSearchResults([]);
            setIsDropdownVisible(false);
            return;
        }
        const fetchSearch = async () => {
            // ... (rest of search fetch logic)
            setIsSearchLoading(true);
            setIsDropdownVisible(true);
            try {
                const res = await fetch(`${apiUrl}/api/shop/getGlobalSearchTerms?term=${debouncedSearchTerm}&limit=7`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                } else {
                    setSearchResults([]);
                }
            } catch (err) {
                console.error("Global search failed", err);
                setSearchResults([]);
            }
            setIsSearchLoading(false);
        };
        fetchSearch();
    }, [debouncedSearchTerm, apiUrl]);


    // --- Original "Click Outside" useEffect (Modified) ---
    useEffect(() => {
        const handleClick = (e) => {
            if (notifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
            if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setIsUserDropdownOpen(false);
            }
            if (isDropdownVisible && searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen, isUserDropdownOpen, isDropdownVisible]);


    // --- Original Handlers (handleLogout, getRelativeTime, etc.) ---
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
        // ... (rest of function)
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };


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

    const handleNotifClick = () => {
        setNotifDropdownOpen(false);
        if (setSelectedPage) {
            setSelectedPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

    const handleResultClick = (result) => {
        const typeToRoute = {
            'CUSTOMER': 'customers',
            'PRODUCT': 'products',
            'SALES': 'sales'
        };
        const route = typeToRoute[result['sourceType'].toUpperCase()];
        if (route) {
            setSearchKey(result['displayName']);
            if (setSelectedPage) {
                setSelectedPage(route);
            } else {
                navigate(`/${route}`);
            }
        }
        setGlobalSearchTerm("");
        setSearchResults([]);
        setIsDropdownVisible(false);
    };

    // 3. --- UPDATED JSX STRUCTURE ---
    // Remove inline styles and the 'topbar-spacer' div
    // Add 3-column layout: topbar-left, topbar-center, topbar-right
    return (
        <header className="topbar">

            {/* --- NEW: TOPBAR LEFT (Toggle + Logo) --- */}
            <div className="topbar-left">
                {/* This button was moved from Sidebar.js */}
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
                    {/* This is the hamburger icon from Sidebar.js */}
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
                            background: toggleColor, // Uses the new color logic
                            borderRadius: '2px',
                            opacity: 0.95
                        }}
                    />
                        <span
                            style={{
                                display: 'block',
                                height: '2px',
                                background: toggleColor, // Uses the new color logic
                                borderRadius: '2px',
                                opacity: 0.85
                            }}
                        />
                        <span
                            style={{
                                display: 'block',
                                height: '2px',
                                background: toggleColor, // Uses the new color logic
                                borderRadius: '2px',
                                opacity: 0.75
                            }}
                        />
                    </div>
                </button>

                {/* This logo was moved from Sidebar.js */}
                <h1 className="logo">{isCollapsed ? '' : 'Clear Bill'}</h1>
            </div>

            {/* --- TOPBAR CENTER (Global Search) --- */}
            <div className="topbar-center">
                <div className="global-search-container" ref={searchDropdownRef}>
                    <i className="fa-duotone fa-solid fa-search search-icon"></i>
                    <input
                        type="text"
                        placeholder="Search customers, products, orders..."
                        className="global-search-input"
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        onFocus={() => {
                            if (searchResults.length > 0) setIsDropdownVisible(true);
                        }}
                    />
                    {isDropdownVisible && (
                        <div className="search-results-dropdown">
                            {isSearchLoading ? (
                                <div className="search-result-item">Loading...</div>
                            ) : searchResults.length === 0 && debouncedSearchTerm ? (
                                <div className="search-result-item">No results found.</div>
                            ) : (
                                searchResults.map((result, index) => (
                                    <div
                                        key={result['sourceId'] ? (result['sourceId'] + result['sourceType']) : index}
                                        className="search-result-item"
                                        onMouseDown={() => handleResultClick(result)}
                                    >
                                        <strong>{result['displayName']}</strong>
                                        <span className="search-result-type">
                                         {result['sourceType'].charAt(0) + result['sourceType'].slice(1).toLowerCase()}
                                    </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- TOPBAR RIGHT (Icons + User Menu) --- */}
            <div className="topbar-right">
                <div
                    className="glass-card2 topbar-buttons-container"
                >
                    {/* 🔔 Notifications */}
                    <div
                        ref={notifDropdownRef}
                        className="topbar-icon-wrapper"
                        style={{position: 'relative'}}
                        onMouseEnter={() => {
                            setIsNotiHovered(true);
                            setNotifDropdownOpen(true);
                        }}
                        onMouseLeave={() => {
                            setTimeout(() => {
                                if (!notifDropdownHover) {
                                    setIsNotiHovered(false);
                                    setNotifDropdownOpen(false);
                                }
                            }, 600);
                        }}
                        onClick={handleNotifClick}
                    >
                        <Bell size={28} weight="duotone" />
                        {unseenCount > 0 && (
                            <span className="notification-badge">
                            {unseenCount}
                        </span>
                        )}
                        {notifDropdownOpen && (
                            <div
                                className="notification-dropdown"
                                onMouseEnter={() => setNotifDropdownHover(true)}
                                onMouseLeave={() => {
                                    setNotifDropdownHover(false);
                                    setNotifDropdownOpen(false);
                                }}
                            >
                                {/* ... (rest of notification dropdown) ... */}
                                <div className="notification-dropdown-header">Notifications</div>
                                {notifications.length === 0 ? (
                                    <div className="notification-dropdown-empty">No new notifications.</div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div key={n.id}
                                             className={`notification-dropdown-item ${!n.seen ? 'unread' : ''}`}
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleNotifClick();
                                             }}
                                        >
                                            <div className="notification-title">{n.title}</div>
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
                        className="topbar-icon-wrapper"
                        onClick={toggleTheme}
                        onMouseEnter={() => setIsThemeHovered(true)}
                        onMouseLeave={() => setIsThemeHovered(false)}
                        style={{ transform: isThemeHovered ? "translateY(-5px)" : "translateY(0)"}}
                    >
                        {theme === "light" ? (
                            <Moon size={28} weight="duotone" />
                        ) : (
                            <Sun size={28} weight="duotone" />
                        )}
                    </div>

                    {/* 👤 User Info Wrapper */}
                    <div
                        ref={userDropdownRef}
                        className="user-profile-wrapper"
                        style={{ position: 'relative' }}
                        onMouseEnter={() => {
                            clearTimeout(window.userDropdownTimeout);
                            setIsUserDropdownOpen(true);
                        }}
                        onMouseLeave={() => {
                            window.userDropdownTimeout = setTimeout(() => {
                                setIsUserDropdownOpen(false);
                            }, 300);
                        }}
                    >
                        <div
                            className="user-profile-trigger"
                            onClick={() => setSelectedPage("profile")}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{ transform: isHovered ? "translateY(-5px)" : "translateY(0)" }}
                        >
                            {profilePic ? (
                                <img
                                    src={profilePic}
                                    alt="Profile"
                                    className="user-profile-pic"
                                />
                            ) : (
                                <UserCircle
                                    size={36}
                                    weight="duotone"
                                />
                            )}
                            <span className="user-profile-name">
                            {userName || "Guest"}
                        </span>
                        </div>

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
                                    // ... (rest of inline styles)
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
                                        setIsUserDropdownOpen(false);
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
                                        setIsUserDropdownOpen(false);
                                    }}
                                >
                                    <i className="fa-duotone fa-regular fa-gear" style={{fontSize:"22px"}}></i>
                                    <span>Settings</span>
                                </div>

                                {/* Logout Item */}
                                <div
                                    className="user-dropdown-item logout"
                                    onClick={() => {
                                        handleLogout();
                                        setIsUserDropdownOpen(false);
                                    }}
                                >
                                    <i className="fa-duotone fa-regular fa-right-from-bracket" style={{fontSize:"22px", color:"#e80a0d"}}></i>
                                    <span>Logout</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>);
};

export default Topbar;