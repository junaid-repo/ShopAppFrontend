import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import BillingPage from './pages/BillingPage';
import BillingPage2 from './pages/BillingPage2';
import ReportsPage from './pages/ReportsPage';
import UserProfilePage from './pages/UserProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import Notification from './pages/Notification';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import AdminChatPage from './pages/AdminChatPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";
import { useSearchKey } from "./context/SearchKeyContext";
import { Toaster } from 'react-hot-toast';
import { AlertProvider } from './context/AlertContext';
import AlertDialog from './components/AlertDialog';

const queryClient = new QueryClient();

function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const config = useConfig();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        document.body.classList.remove('dark-theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#111135' : '#f8fcff00');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    Number.prototype.toLocaleString = function (locales, options) {
        return new Intl.NumberFormat("en-IN", options).format(this.valueOf());
    };

    const checkSession = async () => {
        setIsLoading(true); // Move isLoading to the start
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/profileWithRole`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data);
                handleUserActivity();
                // --- START: NEW UI SETTINGS LOGIC ---
                try {
                    // Make a second call to get UI settings
                    const settingsResponse = await fetch(`${apiUrl}/api/shop/get/user/settings`, {
                        method: 'GET',
                        credentials: 'include',
                    });

                    if (settingsResponse.ok) {
                        const settingsData = await settingsResponse.json();
                        console.log("The ui settings ", settingsData);
                        console.log("The deafult theme as dark", settingsData.ui.darkModeDefault);
                        // Assuming response is like: { darkModeDefault: true, billingPageDefault: false, autoPrintInvoice: true }

                        // 1. Set default theme (only if user hasn't already set one)
                        const savedTheme = localStorage.getItem('theme');
                        if ( settingsData.ui.darkModeDefault) {
                            setTheme('dark');
                        }
                        else{
                            setTheme('light');
                        }

                        // 2. Set default page (only if user is still on the initial 'dashboard' page)
                        if (settingsData.ui.billingPageDefault && selectedPage === 'dashboard') {
                            setSelectedPage('billing2');
                        }

                        // 3. Save auto-print setting to local storage for the billing page
                        localStorage.setItem('autoPrintInvoice', settingsData.ui.autoPrintInvoice);
                        localStorage.setItem('autoSendInvoice', settingsData.billing.autoSendInvoice);

                    } else {
                        console.warn("Could not fetch user UI settings. Using defaults.");
                    }
                } catch (settingsError) {
                    // Log the error but don't break the app; login was still successful
                    console.error('Error fetching user UI settings:', settingsError);
                }
                // --- END: NEW UI SETTINGS LOGIC ---// <-- Call this instead of resetInactivityTimer
            } else {
                setUser(null);
                clearTimers(); // Ensure timers are cleared if session check fails
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setUser(null);
            clearTimers(); // Ensure timers are cleared on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        setIsLoading(true);
        checkSession();
    };

    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) { console.error('Logout failed', e); }
        setUser(null);
        // When logging out, reset selectedPage to the default
        setSelectedPage('dashboard');
        clearTimers(); // <-- Make sure this is called
        setWarning(false); // Also hide warning on explicit logout
    };

    const resetInactivityTimer = () => {
        clearTimers();
        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true);
            let timeLeft = 360;
            setCountdown(timeLeft);
            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);
                if (timeLeft <= 0) {
                    clearTimers();
                    alert("You have been logged out due to inactivity.");
                    handleLogout();
                }
            }, 1000);
        }, 14 * 60 * 1000);
    };

    const clearTimers = () => {
        // Clear both the main inactivity timeout and the countdown interval
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        inactivityTimerRef.current = null;
        countdownRef.current = null;
    };
    const startInactivityWarning = () => {
        // Clear only the main timer before setting a new one
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true); // Show the warning modal/message
            let timeLeft = 360; // Start the 6-minute (360s) countdown
            setCountdown(timeLeft);

            // Clear any previous countdown interval before starting a new one
            if (countdownRef.current) clearInterval(countdownRef.current);

            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);
                if (timeLeft <= 0) {
                    // Time's up - log out
                    clearTimers();
                    alert("You have been logged out due to inactivity."); // Consider using a modal instead of alert
                    handleLogout();
                }
            }, 1000);
        }, 14 * 60 * 1000); // 14 minutes
    };

    const handleUserActivity = useCallback(() => {
        if (!user) return; // Only run if logged in

        clearTimers(); // Clear both main timer and countdown (if active)
        setWarning(false); // Hide the warning modal/message
        startInactivityWarning(); // Restart the 14-minute timer
        // Add dependencies that handleUserActivity relies on indirectly
    }, [user, clearTimers, setWarning, startInactivityWarning]);

    const { setSearchKey } = useSearchKey();

    useEffect(() => {
        checkSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means run only once

    // Effect 2: Manage activity listeners based on login state
    useEffect(() => {
        // Only add listeners if a user is logged in
        if (user) {
            const resetEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            const activityHandler = () => handleUserActivity(); // Use the memoized handler

            resetEvents.forEach(evt => window.addEventListener(evt, activityHandler, { capture: true, passive: true }));
            console.log("Activity listeners added."); // For debugging

            // Start the timer when listeners are added (i.e., user is confirmed logged in)
            handleUserActivity();

            // Cleanup function: Remove listeners when user logs out or component unmounts
            return () => {
                console.log("Removing activity listeners."); // For debugging
                resetEvents.forEach(evt => window.removeEventListener(evt, activityHandler, { capture: true }));
                clearTimers(); // Also clear timers on logout/unmount
            };
        } else {
            // If there's no user, ensure any stray timers are cleared
            clearTimers();
            console.log("No user, ensuring timers are clear and listeners removed."); // For debugging
            // No need to return a cleanup function here as no listeners were added
        }
    }, [user, handleUserActivity]);

    const [selectedPage, setSelectedPage] = useState('dashboard');

    useEffect(() => {
        if (selectedPage !== 'customers') {
            setSearchKey('');
        }
    }, [selectedPage, setSearchKey]);

    const isAdmin = user?.roles?.includes('ADMIN') ?? false;

    // This is the definitive logic for setting the page.
    // It runs on every render but only changes the page if the admin is on the default 'dashboard' state.
    let effectivePage = selectedPage;
    if (isAdmin && selectedPage === 'chat') {
        effectivePage = 'adminChat';
    }

    const pages = {
        dashboard: <DashboardPage setSelectedPage={setSelectedPage} />,
        products: <ProductsPage setSelectedPage={setSelectedPage} />,
        sales: <SalesPage setSelectedPage={setSelectedPage} />,
        customers: <CustomersPage setSelectedPage={setSelectedPage} />,
        payments: <PaymentsPage setSelectedPage={setSelectedPage} />,
        billing: <BillingPage setSelectedPage={setSelectedPage} />,
        billing2: <BillingPage2 setSelectedPage={setSelectedPage} />,
        reports: <ReportsPage setSelectedPage={setSelectedPage} />,
        profile: <UserProfilePage setSelectedPage={setSelectedPage} />,
        analytics: <AnalyticsPage setSelectedPage={setSelectedPage} />,
        terms: <TermsPage setSelectedPage={setSelectedPage} />,
        privacy: <PrivacyPage setSelectedPage={setSelectedPage} />,
        help: <HelpPage setSelectedPage={setSelectedPage} />,
        notifications: <Notification setSelectedPage={setSelectedPage} />,
        settings: <SettingsPage setSelectedPage={setSelectedPage} />,
        chat: <ChatPage setSelectedPage={setSelectedPage} />,
        adminChat: <AdminChatPage adminUsername={user?.username} />
    };

    if (isLoading) {
        return <div>Loading Application...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <AlertProvider>
                <AlertDialog />
                <Router>
                    <Routes>
                        <Route
                            path="/login"
                            element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />}
                        />
                        <Route
                            path="/*"
                            element={
                                user ? (
                                    <MainLayout
                                        onLogout={handleLogout}
                                        theme={theme}
                                        toggleTheme={toggleTheme}
                                        // Pass the calculated `effectivePage` down.
                                        selectedPage={effectivePage}
                                        setSelectedPage={setSelectedPage}
                                        pages={pages}
                                        isAdmin={isAdmin}
                                    />
                                ) : (
                                    <Navigate to="/login" replace />
                                )
                            }
                        />
                    </Routes>
                </Router>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 8000,
                        style: {
                            background: 'lightgreen',
                            color: 'var(--text-color)',
                            borderRadius: '25px',
                            padding: '12px',
                            minWidth: '350px',
                            fontSize: '16px',
                        },
                    }}
                />
            </AlertProvider>
        </QueryClientProvider>
    );
}

export default App;