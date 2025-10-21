import React, { useState, useEffect, useRef } from 'react';
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
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/profileWithRole`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data);
                resetInactivityTimer();
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setUser(null);
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
        clearTimers();
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
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const { setSearchKey } = useSearchKey();

    useEffect(() => {
        const resetEvents = ['mousemove', 'keydown', 'click'];
        const resetHandler = () => { if (user) resetInactivityTimer(); };
        resetEvents.forEach(evt => window.addEventListener(evt, resetHandler));
        checkSession();
        return () => resetEvents.forEach(evt => window.removeEventListener(evt, resetHandler));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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