// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import BillingPage from './pages/BillingPage';
import ReportsPage from './pages/ReportsPage';
import UserProfilePage from './pages/UserProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);

    // 🔹 Check token validity
    const checkToken = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            setIsAuthenticated(false);
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1])); // decode JWT payload
            const expiry = payload.exp * 1000; // convert to ms
            alert(expiry);
            if (Date.now() >= expiry) {
                alert("Session expired. You have been logged out.");
                handleLogout();
            } else {
                setIsAuthenticated(true);
            }
        } catch (e) {
            console.error("Invalid token:", e);
            handleLogout();
        }
    };

    // 🔹 Handle login
    const handleLogin = () => {
        setIsAuthenticated(true);
        resetInactivityTimer();
    };

    // 🔹 Handle logout
    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        setIsAuthenticated(false);
        clearTimers();
    };

    // 🔹 Inactivity Timers
    const resetInactivityTimer = () => {
        clearTimers();
        // Start inactivity timer (15 mins = 900000 ms)
        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true); // show warning at 14 min
            let timeLeft = 60;
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
        }, 14 * 60 * 1000); // warning at 14 mins
    };

    const clearTimers = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    // 🔹 Track user activity
    useEffect(() => {
        const resetEvents = ['mousemove', 'keydown', 'click'];
        const resetHandler = () => resetInactivityTimer();

        resetEvents.forEach(evt => window.addEventListener(evt, resetHandler));
        return () => resetEvents.forEach(evt => window.removeEventListener(evt, resetHandler));
    }, []);

    // 🔹 Run checks on load + storage change
    useEffect(() => {
        checkToken();
        window.addEventListener("storage", checkToken);
        return () => window.removeEventListener("storage", checkToken);
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                {warning && (
                    <div className="fixed bottom-4 right-4 bg-yellow-200 border border-yellow-500 text-yellow-900 px-4 py-3 rounded shadow">
                        ⚠️ No activity detected. Logging out in {countdown}s...
                    </div>
                )}

                <Routes>
                    {/* Login route */}
                    <Route
                        path="/login"
                        element={
                            !isAuthenticated
                                ? <LoginPage onLogin={handleLogin} />
                                : <Navigate to="/" replace />
                        }
                    />

                    {/* Protected routes */}
                    <Route
                        path="/*"
                        element={
                            isAuthenticated
                                ? <ProtectedRoutes onLogout={handleLogout} />
                                : <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </Router>
        </QueryClientProvider>
    );
}

const ProtectedRoutes = ({ onLogout }) => {
    const navigate = useNavigate();

    const logoutAndRedirect = () => {
        onLogout();
        navigate("/login", { replace: true });
    };

    return (
        <MainLayout onLogout={logoutAndRedirect}>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
        </MainLayout>
    );
};

export default App;
