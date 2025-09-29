// src/pages/LoginPage.js
import React, { useState, useEffect  } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LoginPage.css';
import { useConfig } from "./ConfigProvider";
import { GoogleLogin } from '@react-oauth/google';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import jwt_decode from "jwt-decode";

const LoginPage = ({ onLogin }) => {
    // Login
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    // Unified modal controller: null | 'forgot' | 'otp' | 'result'
    const [modal, setModal] = useState(null);

    // --- New States for Policy Modal ---
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policyContent, setPolicyContent] = useState({ title: '', content: '' });

    // Forgot password flow
    const [forgotInput, setForgotInput] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotAttempts, setForgotAttempts] = useState(0); // limit 5 per session

    // OTP + reset flow
    const [otp, setOtp] = useState('');
    const [otpAttempts, setOtpAttempts] = useState(0); // limit 3 wrong tries
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // ✅ FIX 1: New state for OTP modal-specific errors
    const [otpError, setOtpError] = useState('');


    // Final result
    const [resultMessage, setResultMessage] = useState('');

    const navigate = useNavigate();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";
    const [resendTimer, setResendTimer] = useState(0);
    const [retryCount, setRetryCount] = useState(null);

    // --- NEW STATES FOR REGISTER FLOW ---
    const [registerData, setRegisterData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [registerMessage, setRegisterMessage] = useState("");
    const [registeringUser, setRegisteringUser] = useState(null); // stores email/username after register

    // new state for Google error feedback
    const [googleError, setGoogleError] = useState('');

    // --- Generic Policy Content ---
    const termsText = (
        <>

            <p className="mb-4">Welcome to Clear Bill! These terms and conditions outline the rules and regulations for the use of our services.</p>
            <h3 className="text-lg font-bold mb-2">1. Acceptance of Terms</h3>
            <p className="mb-4">By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
            <h3 className="text-lg font-bold mb-2">2. User Accounts</h3>
            <p className="mb-4">You are responsible for safeguarding your account details, and you are responsible for all activities that occur under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
            <h3 className="text-lg font-bold mb-2">3. Limitation of Liability</h3>
            <p>Our service is provided "as is." We do not warrant that the service will be uninterrupted, secure, or error-free. In no event shall Clear Bill be liable for any indirect, incidental, special, consequential or punitive damages.</p>
        </>
    );

    const privacyText = (
        <>

            <p className="mb-4">Your privacy is important to us. It is Clear Bill's policy to respect your privacy regarding any information we may collect from you across our website.</p>
            <h3 className="text-lg font-bold mb-2">1. Information We Collect</h3>
            <p className="mb-4">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
            <h3 className="text-lg font-bold mb-2">2. Use of Information</h3>
            <p className="mb-4">We use the information we collect to operate, maintain, and provide the features and functionality of the service, as well as to communicate directly with you, such as to send you email messages and push notifications.</p>
            <h3 className="text-lg font-bold mb-2">3. Data Security</h3>
            <p>We use commercially acceptable means to protect your Personal Information, but remember that no method of transmission over the internet, or method of electronic storage, is 100% secure and reliable.</p>
        </>
    );

    // Feature list for the showcase
    const features = [
        {
            icon: <DashboardIcon style={{ fontSize: 36, color: "#3b82f6" }} />,
            title: 'Analytics Dashboard',
            description: 'Visualize your sales, profits, and growth with our intuitive dashboard.'
        },
        {
            icon: <Inventory2Icon style={{ fontSize: 36, color: "#f59e0b" }} />,
            title: 'Stock Management',
            description: 'Effortlessly track inventory, manage stock levels, and get low-stock alerts.'
        },
        {
            icon: <PeopleAltIcon style={{ fontSize: 36, color: "#10b981" }} />,
            title: 'Customer Management',
            description: 'Build strong customer relationships with a centralized database and history.'
        },
        {
            icon: <ReceiptLongIcon style={{ fontSize: 36, color: "#6366f1" }} />,
            title: 'Effortless Billing',
            description: 'Create and send professional invoices in seconds. Billing made simple.'
        },
        {
            icon: <PaymentIcon style={{ fontSize: 36, color: "#ef4444" }} />,
            title: 'Payment Tracking',
            description: 'Manage all incoming payments, track dues, and send reminders easily.'
        },
        {
            icon: <AssessmentIcon style={{ fontSize: 36, color: "#8b5cf6" }} />,
            title: 'Report Generation',
            description: 'Generate detailed sales, stock, and financial reports with just a click.'
        },
    ];


    // --- Handlers for Policy Modal ---
    const openPolicyModal = (type) => {
        if (type === 'terms') {
            setPolicyContent({ title: 'Terms of Service', content: termsText });
        } else {
            setPolicyContent({ title: 'Privacy Policy', content: privacyText });
        }
        setShowPolicyModal(true);
    };

    const closePolicyModal = () => setShowPolicyModal(false);

// --- HELPERS TO OPEN/CLOSE ---
    const openRegisterModal = () => {
        setRegisterData({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
        setRegisterMessage("");
        setModal("register");
    };
    const closeRegisterModal = () => {
        setModal(null);
        setRegisterMessage("");
    };

    // ✅ FIX 2: Modified useEffect to handle timers for BOTH OTP modals
    useEffect(() => {
        let interval;
        if (modal === "registerOtp" || modal === 'otp') {
            setResendTimer(60); // Start a 60-second timer for both
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        // This logic is specific to the registration flow
        if (modal === "registerOtp") {
            const fetchRetry = async () => {
                try {
                    const res = await fetch(authApiUrl + `/auth/otp-retry-count?username=${registeringUser}`);
                    const data = await res.json();
                    setRetryCount(data.retryLeft ?? null);
                } catch (err) {
                    console.error("Retry count fetch error:", err);
                    setRetryCount(null);
                }
            };
            fetchRetry();
        }

        return () => clearInterval(interval);
    }, [modal, registeringUser, authApiUrl]); // Reruns when the modal type changes


// 🔄 Resend OTP handler for registration
    const handleResendOtp = async () => {
        try {
            const res = await fetch(authApiUrl + "/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: registeringUser })
            });
            const data = await res.json();
            if (data.success) {
                setResendTimer(60); // restart timer
            } else {
                setResultMessage("❌ " + (data.message || "Failed to resend OTP"));
                openResultModal("❌ " + (data.message || "Failed to resend OTP"));
            }
        } catch (err) {
            openResultModal("❌ Error: " + err.message);
        }
    };

    // ---------- GOOGLE LOGIN HANDLER -------------
    const handleGoogleSuccess = async (credentialResponse) => {
        const idToken = credentialResponse?.credential;
        if (!idToken) {
            setGoogleError("Google did not return a credential/token");
            return;
        }
        try {
            const resp = await fetch(authApiUrl + "/auth/new/google/user", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                onLogin(true);
                navigate('/');
            } else {
                setGoogleError(data.message || "Google Login failed");
            }
        } catch (err) {
            setGoogleError("Google Login error: " + err.message);
        }
    };

    const handleGoogleError = () => {
        setGoogleError("Google Login was cancelled or failed");
    };

// --- HANDLE REGISTER API CALL ---
    const handleRegister = async () => {
        const { fullName, email, phone, password, confirmPassword } = registerData;
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            setRegisterMessage("❌ All fields are required");
            return;
        }
        if (password !== confirmPassword) {
            setRegisterMessage("❌ Passwords do not match");
            return;
        }

        try {
            const res = await fetch(authApiUrl + "/auth/register/newuser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData)
            });
            const data = await res.json();

            if (data.success) {
                setRegisterMessage("✅ Registration successful, please verify OTP");
                setRegisteringUser(data.username || email);
                setModal(null);
                setOtp("");
                setModal("registerOtp");
            } else {
                setRegisterMessage("❌ " + (data.message || "Registration failed"));
            }
        } catch (err) {
            setRegisterMessage("❌ Error: " + err.message);
        }
    };

// --- HANDLE REGISTER OTP VERIFY ---
    const handleRegisterOtp = async () => {
        if (!otp || otp.length !== 6) {
            openResultModal("❌ Enter valid 6-digit OTP");
            return;
        }

        const payload = { username: registeringUser, otp };
        try {
            const res = await fetch(authApiUrl + "/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            console.log(data);
            if (data.success) {
                setIsSuccess(true);
                openResultModal("✅ " + (data.message || "Registration complete! Your username is "||data.username ||" Please login with this username and password to use the system."));
            } else {
                alert("enterd Here");
                setIsSuccess(false);
                openResultModal("❌ " + (data.message || "Invalid OTP"));
                setModal("registerOtp");
            }
        } catch (err) {

            openResultModal("❌ Error: " + err.message);
        }
    };

    // ---------- LOGIN ----------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(authApiUrl + "/auth/authenticate", {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const textResponse = await response.text();

            if (textResponse === "Please login using google login") {
                setError(textResponse);
                return;
            }

            if (textResponse) {
                onLogin(true);
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        }
    };

    // Helpers to open/close specific modals
    const openForgotModal = () => {
        setForgotMessage('');
        setModal('forgot');
    };

    const closeForgotModal = () => {
        setForgotMessage('');
        setModal(null);
    };

    const openOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpAttempts(0);
        setOtpError(''); // ✅ FIX 1: Reset OTP error on open
        setModal('otp');
    };

    const closeOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpAttempts(0);
        setOtpError(''); // ✅ FIX 1: Reset OTP error on close
        setModal(null);
    };

    const openResultModal = (message) => {
        setResultMessage(message);
        setModal('result');
    };

    const closeResultModal = () => {
        setResultMessage('');
        setModal(null);
    };

    // ---------- FORGOT PASSWORD ----------
    const handleForgotPassword = async () => {
        if (!forgotInput) {
            setForgotMessage("❌ Please enter Email or UserId");
            return;
        }

        if (forgotAttempts >= 5) {
            setForgotMessage("❌ Too many attempts. Please try again later.");
            return;
        }

        setForgotAttempts(prev => prev + 1);

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                setForgotMessage("✅ OTP sent to your email address");
                setModal(null);
                openOtpModal();
            } else {
                setForgotMessage(`❌ ${data.message || "Invalid request"}`);
            }
        } catch (err) {
            setForgotMessage("❌ Error: " + err.message);
        }
    };

    // ✅ FIX 2: New handler for resending OTP during password reset
    const handleResendPasswordOtp = async () => {
        setOtpError(''); // Clear previous errors
        if (!forgotInput) {
            setOtpError("User identifier is missing. Please start over.");
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                setOtpError("✅ A new OTP has been sent.");
                setResendTimer(60); // Restart timer
            } else {
                setOtpError(`❌ ${data.message || "Failed to resend OTP"}`);
            }
        } catch (err) {
            setOtpError("❌ Error: " + err.message);
        }
    };


    // ---------- RESET PASSWORD ----------
    const handlePasswordReset = async () => {
        if (!otp || !newPassword || !confirmPassword) {
            setOtpError("❌ All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            setOtpError("❌ Passwords do not match");
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            otp,
            newPassword,
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                // ✅ CORRECTED LOGIC
                setIsSuccess(true);
                // First, call the function that cleans up and closes the OTP modal
                closeOtpModal();
                // Then, open the result modal with the success message from the backend
                openResultModal("✅ " + (data.message || "Password updated successfully!"));
            } else {
                const nextAttempts = otpAttempts + 1;
                setOtpAttempts(nextAttempts);
                setOtp(''); // Clear the OTP input for re-entry

                if (nextAttempts >= 3) {
                    setModal(null);
                    openResultModal("❌ Too many wrong OTP attempts. Please resend OTP.");
                } else {
                    setOtpError("❌ " + (data.message || "Wrong OTP, try again."));
                }
            }
        } catch (err) {
            setOtpError("❌ Error: " + err.message);
        }
    };
    return (
        <>
            <div className="login-page-wrapper">
                <div className="shape shape1"></div>
                <div className="shape shape2"></div>

                <div className="main-container">
                    {/* Feature Showcase Section */}
                    <div className="features-container">
                        <h1 className="brand-logo">ClearBill</h1>
                        <p className="tagline">Streamline Your Business Operations</p>
                        <ul className="feature-list">
                            {features.map((feature, index) => (
                                <li
                                    key={index}
                                    className={`feature-item ${index % 2 === 0 ? "left" : "right"}`}
                                >
                                    <div className="feature-icon">{feature.icon}</div>
                                    <div className="feature-text">
                                        <h3>{feature.title}</h3>
                                        <p>{feature.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Login Form Section */}
                    <div className="login-container">
                        <div className="login-box">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center" style={{paddingBottom: "30px"}}>Welcome Back!</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="input-group">
                                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <a href="#" onClick={openForgotModal} className="forgot-password-link" style={{marginTop: "45px"}}>Forgot Password?</a>
                                </div>
                                {error && <p className="error-message">{error}</p>}
                                <button type="submit" className="btn login-btn" style={{marginTop: "24px", marginBottom: "0px"}}>Login</button>
                                <p className="terms-text" style={{marginBottom: "45px", marginTop: "10px"}}>
                                    By logging in, you agree to our <br />
                                    <span onClick={() => openPolicyModal('terms')}>Terms</span> & <span onClick={() => openPolicyModal('privacy')}>Privacy Policy</span>.
                                </p>
                            </form>
                            <div className="login-actions">
                                <button className="btn register-btn" onClick={openRegisterModal}>Register</button>
                                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} shape="pill" />
                            </div>
                            {googleError && <p className="error-message" style={{ marginTop: "1rem" }}>{googleError}</p>}
                        </div>
                    </div>
                </div>

                {/* Registration OTP Modal */}
                {modal === "registerOtp" && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Verify OTP</h2>
                                <button className="close-btn" onClick={() => setModal(null)}>×</button>
                            </div>
                            <div className="form-group">
                                <label>Enter OTP</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.5rem" }}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                {retryCount !== null && (
                                    <small style={{ display: "block", marginTop: "0.5rem", color: "gray" }}>
                                        Retry attempts left: {retryCount}
                                    </small>
                                )}
                            </div>
                            <div
                                className="form-actions"
                                style={{ display: "flex", flexDirection: "row", gap: "10px" }}
                            >
                                <button className="btn" onClick={handleRegisterOtp}>
                                    Submit
                                </button>
                                <button
                                    className="btn"
                                    disabled={resendTimer > 0}
                                    onClick={handleResendOtp}
                                >
                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* Policy Modal */}
                {showPolicyModal && (
                    <div className="modal-overlay" onClick={closePolicyModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{policyContent.title}</h2>
                                <button className="close-btn" onClick={closePolicyModal}>&times;</button>
                            </div>
                            <div style={{ padding: '0 10px', textAlign: 'left', overflowY: 'auto', maxHeight: '60vh', lineHeight: '1.6' }}>
                                {policyContent.content}
                            </div>
                        </div>
                    </div>
                )}


                {/* Forgot Password Modal */}
                {modal === 'forgot' && (
                    <div className="modal-overlay" onClick={closeForgotModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Forgot Password</h2>
                                <button className="close-btn" onClick={closeForgotModal}>&times;</button>
                            </div>
                            <div className="form-group">
                                <label>Enter Email or User ID</label>
                                <input
                                    type="text"
                                    value={forgotInput}
                                    onChange={(e) => setForgotInput(e.target.value)}
                                    placeholder="Email or UserId"
                                />
                            </div>
                            {forgotMessage && (
                                <p className="error-message" style={{ color: forgotMessage.startsWith("✅") ? "green" : "red" }}>
                                    {forgotMessage}
                                </p>
                            )}
                            <div className="form-actions">
                                <button className="btn" onClick={handleForgotPassword}>Send OTP</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Registration Modal */}
                {modal === "register" && (
                    <div className="modal-overlay" onClick={closeRegisterModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Create Account</h2>
                                <button className="close-btn" onClick={closeRegisterModal}>&times;</button>
                            </div>
                            <div className="form-group"><input type="text" placeholder="Full Name" value={registerData.fullName} onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}/></div>
                            <div className="form-group"><input type="email" placeholder="Email" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} /></div>
                            <div className="form-group"><input type="text" placeholder="Phone" value={registerData.phone} onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })} /></div>
                            <div className="form-group"><input type="password" placeholder="Password" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} /></div>
                            <div className="form-group"><input type="password" placeholder="Confirm Password" value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} /></div>
                            <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }} >
                                <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                                <label htmlFor="terms">I agree to the <span onClick={() => setShowTermsModal(true)} style={{ color: 'var(--theme-color)', textDecoration: 'underline', cursor: 'pointer' }}>Terms & Conditions</span></label>
                            </div>
                            {registerMessage && <p className="error-message" style={{ color: registerMessage.startsWith("✅") ? "green" : "red" }}>{registerMessage}</p>}
                            <div className="form-actions"><button className="btn" onClick={handleRegister} disabled={!termsAccepted}>Register</button></div>
                        </div>
                    </div>
                )}

                {/* OTP & Reset Password Modal (UPDATED) */}
                {modal === 'otp' && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Reset Password</h2>
                                <button className="close-btn" onClick={closeOtpModal}>×</button>
                            </div>
                            <div className="form-group">
                                <label>Enter 6-digit OTP</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.5rem" }}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                <small style={{ opacity: 0.7 }}>Attempts left: {Math.max(0, 3 - otpAttempts)}</small>
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                            </div>
                            {/* ✅ FIX 1 & 2: Display local error and add Resend button */}
                            {otpError && (
                                <p className="error-message" style={{ color: otpError.startsWith("✅") ? "green" : "red", marginTop: "1rem" }}>
                                    {otpError}
                                </p>
                            )}
                            <div className="form-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
                                <button className="btn" onClick={handlePasswordReset}>Submit</button>
                                <button className="btn" disabled={resendTimer > 0} onClick={handleResendPasswordOtp}>
                                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Result Modal (exclusive) */}
                {modal === 'result' && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ textAlign: "center" }}>
                            <h2 style={{ color: isSuccess ? "green" : "red" }}>{resultMessage}</h2>
                            <div className="form-actions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                                {resultMessage.includes("Too many wrong OTP") && (
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            closeResultModal();
                                            openForgotModal();
                                        }}
                                    >
                                        Resend OTP
                                    </button>
                                )}
                                <button className="btn" onClick={closeResultModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default LoginPage;