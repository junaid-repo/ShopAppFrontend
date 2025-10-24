// src/components/Topbar.js
import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
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
import { useSearchKey } from "../context/SearchKeyContext"; // <-- 1. IMPORT useSearchKey

// --- 2. ADD A DEBOUNCE HOOK (copied from your CustomersPage.js) ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};


const Topbar = ({ onLogout, theme, toggleTheme, setSelectedPage }) => {
    // --- Original State ---
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

    // --- 3. ADD NEW STATE FOR GLOBAL SEARCH ---
    const { setSearchKey } = useSearchKey();
    const [globalSearchTerm, setGlobalSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const debouncedSearchTerm = useDebounce(globalSearchTerm, 300);
    const searchDropdownRef = useRef(null);

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

    // --- Original fetchUnseenNotifications (as a const) ---
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


    // --- 4. NEW useEffect FOR FETCHING SEARCH RESULTS ---
    useEffect(() => {
        // If the search term is empty, clear results and hide dropdown
        if (!debouncedSearchTerm) {
            setSearchResults([]);
            setIsDropdownVisible(false);
            return;
        }

        const fetchSearch = async () => {
            setIsSearchLoading(true);
            setIsDropdownVisible(true);

            try {
                // Call your new global search API
                const res = await fetch(`${apiUrl}/api/shop/getGlobalSearchTerms?term=${debouncedSearchTerm}&limit=7`, {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log("The search result ",data);
                    setSearchResults(data);
                } else {
                    setSearchResults([]); // Clear on error
                }
            } catch (err) {
                console.error("Global search failed", err);
                setSearchResults([]);
            }
            setIsSearchLoading(false);
        };

        fetchSearch();
    }, [debouncedSearchTerm, apiUrl]); // Re-run when debounced term changes


    // --- 5. MODIFY "Click Outside" useEffect TO INCLUDE SEARCH DROPDOWN ---
    useEffect(() => {
        const handleClick = (e) => {
            if (notifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
            if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setIsUserDropdownOpen(false);
            }
            // Add this new check for the search dropdown
            if (isDropdownVisible && searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen, isUserDropdownOpen, isDropdownVisible]); // <-- Add dependency


    // --- Original handleLogout ---
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

    // --- Original getRelativeTime ---
    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };


    // --- Original handleClearNotifications ---
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

    // --- Original handleNotifClick ---
    const handleNotifClick = () => {
        setNotifDropdownOpen(false);
        if (setSelectedPage) {
            setSelectedPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

    // --- 6. NEW HANDLER FOR WHEN A SEARCH RESULT IS CLICKED ---
    // --- 6. NEW HANDLER FOR WHEN A SEARCH RESULT IS CLICKED ---
    const handleResultClick = (result) => {
        // 1. Map API sourceType to your page's route name
        const typeToRoute = {
            'CUSTOMER': 'customers',
            'PRODUCT': 'products',
            'SALES': 'sales'
            // Add any other types your API returns
        };
        // Use map key access: result['sourceType']
        const route = typeToRoute[result['sourceType'].toUpperCase()];

        if (route) {
            // 2. Set the global search key (this is the context search)
            // Use map key access: result['displayName']
            setSearchKey(result['displayName']);

            // 3. Navigate to the correct page
            if (setSelectedPage) {
                setSelectedPage(route);
            } else {
                navigate(`/${route}`); // Fallback navigation
            }
        }

        // 4. Clear and close the search bar
        setGlobalSearchTerm("");
        setSearchResults([]);
        setIsDropdownVisible(false);
    };


    return (<header
        className="topbar"
        style={{
            display: "flex",
            justifyContent: "space-between", // This will now create 3 columns
            alignItems: "center",
            position: "relative",
            zIndex: 1000,
        }}
    >
        {/* --- 1. ADD THIS SPACER DIV --- */}
        {/* This empty div will push the search bar to the middle */}
        <div className="topbar-spacer"></div>

        {/* --- 2. GLOBAL SEARCH BAR (No changes to this part) --- */}
        <div className="global-search-container" ref={searchDropdownRef}>
            <i className="fa-duotone fa-solid fa-search search-icon"></i>
            <input
                type="text"
                placeholder="Search customers, products, orders..."
                className="global-search-input"
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onFocus={() => {
                    // Show dropdown on focus only if there are already results
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

        {/* --- 3. EXISTING BUTTON CONTAINER (No changes to this part) --- */}
        <div
            className="glass-card2 topbar-buttons-container"
        >
            {/* ... (all your existing icons: Bell, Moon/Sun, User) ... */}
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
    </header>);
};

export default Topbar;