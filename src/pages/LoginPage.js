// src/pages/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { useConfig } from "./ConfigProvider";

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const inactivityTimerRef = useRef(null);

    const [showRegister, setShowRegister] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [registerData, setRegisterData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });
    const [validationError, setValidationError] = useState("");
    const [otp, setOtp] = useState("");
    const [otpMessage, setOtpMessage] = useState("");
    const [showResultModal, setShowResultModal] = useState(false);

    // Resend OTP
    const [resendDisabled, setResendDisabled] = useState(true);
    const [timer, setTimer] = useState(30);

    const config = useConfig();
    var apiUrl = config?.API_URL || "";

    // Reset registerData on refresh
    useEffect(() => {
        setRegisterData({
            fullName: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: ""
        });
    }, []);

    // OTP resend timer
    useEffect(() => {
        let interval;
        if (showOtpModal && resendDisabled) {
            setTimer(30);
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setResendDisabled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [showOtpModal]);

    // Inactivity timer
    const resetInactivityTimer = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = setTimeout(() => {
            handleLogout();
        }, 15 * 60 * 1000);
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        window.removeEventListener('mousemove', resetInactivityTimer);
        window.removeEventListener('keydown', resetInactivityTimer);
        onLogin(false);
        navigate('/login');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch(apiUrl + "/auth/authenticate", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error('Login failed');
            const data = await response.text();
            if (data) {
                localStorage.setItem('jwt_token', data);
                onLogin(true);
                window.addEventListener('mousemove', resetInactivityTimer);
                window.addEventListener('keydown', resetInactivityTimer);
                resetInactivityTimer();
                navigate('/');
            } else {
                setError("Invalid username or password");
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        }
    };

    // Registration Validation
    const validateRegister = () => {
        const { fullName, email, phone, password, confirmPassword } = registerData;
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            return "All fields are required.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return "Invalid email format.";
        }
        if (!/^[98765]\d{9}$/.test(phone)) {
            return "Phone must be 10 digits starting with 9/8/7/6/5.";
        }
        if (password !== confirmPassword) {
            return "Passwords do not match.";
        }
        return "";
    };

    const handleRegister = async () => {
        const err = validateRegister();
        if (err) {
            setValidationError(err);
            return;
        }
        setValidationError("");

        try {
            // API call to validate email/phone
            const payload = { email: registerData.email, phone: registerData.phone };
            console.log("VALIDATE EMAIL/PHONE PAYLOAD:", payload);

            const response = await fetch(apiUrl + "/auth/validate-contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.status) {
                setValidationError(data.message || "Invalid email or phone.");
                return;
            }

            // API call to register
            const registerPayload = { ...registerData };
            console.log("REGISTER API PAYLOAD:", registerPayload);

            const regResponse = await fetch(apiUrl + "/auth/register/newuser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerPayload)
            });

            const regData = await regResponse.json();
            if (regResponse.ok && regData.username) {
                localStorage.setItem("temp_username", regData.username);
                setShowRegister(false);
                setShowOtpModal(true);
                setResendDisabled(true);
            } else {
                setValidationError(regData.message || "Registration failed.");
            }
        } catch (err) {
            setValidationError("Error: " + err.message);
        }
    };

    const handleOtpVerify = async () => {
        const storedUser = localStorage.getItem("temp_username");
        if (!storedUser) return;

        try {
            const payload = { username: storedUser, otp: otp };
            console.log("OTP VERIFY API PAYLOAD:", payload);

            const response = await fetch(apiUrl + "/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            setShowOtpModal(false);
            setShowResultModal(true);

            if (response.ok && data.success) {
                setOtpMessage(`🎉 Your account is created with ${data.username}`);
            } else {
                setOtpMessage("❌ Verification unsuccessful");
            }
        } catch (err) {
            setOtpMessage("Error: " + err.message);
            setShowResultModal(true);
        }
    };

    const handleResendOtp = async () => {
        const storedUser = localStorage.getItem("temp_username");
        if (!storedUser) return;
        try {
            const payload = { username: storedUser };
            console.log("RESEND OTP PAYLOAD:", payload);

            await fetch(apiUrl + "/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            // restart timer
            setResendDisabled(true);
            setTimer(30);
        } catch (err) {
            console.error("Resend OTP failed:", err);
        }
    };

    useEffect(() => {
        return () => {
            clearTimeout(inactivityTimerRef.current);
            window.removeEventListener('mousemove', resetInactivityTimer);
            window.removeEventListener('keydown', resetInactivityTimer);
        };
    }, []);

    return (
        <div className="login-container">
            <div className="login-box glass-card">
                <h1 className="login-logo">ShopFlow</h1>
                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn login-btn">Login</button>
                </form>

                {/* Extra Buttons */}
             {/*   <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <button className="btn same-size-btn">Forgot Password</button>
                    <button className="btn same-size-btn" onClick={() => setShowRegister(true)}>Register</button>
                </div>*/}
            </div>

            {/* Register Modal */}
            {showRegister && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Register</h2>
                            <button className="close-btn" onClick={() => setShowRegister(false)}>×</button>
                        </div>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={registerData.fullName}
                                   onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={registerData.email}
                                   onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" value={registerData.phone}
                                   onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" value={registerData.password}
                                   onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                value={registerData.confirmPassword}
                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                style={{
                                    border: registerData.confirmPassword
                                        ? (registerData.confirmPassword === registerData.password
                                            ? "2px solid lightgreen"
                                            : "2px solid red")
                                        : ""
                                }}
                            />
                        </div>
                        {validationError && <p className="error-message">{validationError}</p>}
                        <div className="form-actions">
                            <button className="btn" onClick={handleRegister}>Send OTP to Email</button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {showOtpModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Verify OTP</h2>
                            <button className="close-btn" onClick={() => setShowOtpModal(false)}>×</button>
                        </div>
                        <div className="form-group">
                            <label>Enter 6-digit OTP</label>
                            <input type="number" maxLength={6} value={otp}
                                   onChange={(e) => setOtp(e.target.value)} />
                            <small style={{ color: "#666" }}>OTP is valid for 10 minutes</small>
                        </div>
                        <div className="form-actions" style={{ display: "flex", gap: "10px" }}>
                            <button className="btn" onClick={handleOtpVerify}>Verify</button>
                            <button className="btn btn-cancel" onClick={handleResendOtp} disabled={resendDisabled}>
                                Resend OTP {resendDisabled ? `(${timer})` : ""}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {showResultModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center" }}>
                        <h2 style={{ color: otpMessage.startsWith("🎉") ? "green" : "red" }}>
                            {otpMessage}
                        </h2>
                        <div className="form-actions" style={{ marginTop: "20px" }}>
                            <button className="btn" onClick={() => setShowResultModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
