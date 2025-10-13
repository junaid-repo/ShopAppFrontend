// src/pages/SettingsPage.jsx

import React, { useState, useEffect } from 'react';
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
import './SettingsPage.css'; // We will create this file next

const SettingsPage = () => {
    const { showAlert } = useAlert();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";

    // --- State Management ---

    // Modals
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);

    // Account Section
    const [passwordStep, setPasswordStep] = useState(1);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [newUsername, setNewUsername] = useState('');
    const [usernameCheck, setUsernameCheck] = useState({ status: null, message: '' });
    const [isChecking, setIsChecking] = useState(false);

    // UI Settings Section
    const [uiSettings, setUiSettings] = useState({
        darkModeDefault: false,
        billingPageDefault: false,
        autoPrintInvoice: false,
    });
    const [originalUiSettings, setOriginalUiSettings] = useState({});
    const isUiDirty = JSON.stringify(uiSettings) !== JSON.stringify(originalUiSettings);

    // Scheduler Settings Section
    const [schedulerSettings, setSchedulerSettings] = useState({
        lowStockAlerts: true,
        autoDeleteNotificationsDays: 30,
        autoDeleteCustomers: {
            enabled: false,
            minSpent: 100,
            inactiveDays: 90,
        },
    });
    const [originalSchedulerSettings, setOriginalSchedulerSettings] = useState({});
    const isSchedulersDirty = JSON.stringify(schedulerSettings) !== JSON.stringify(originalSchedulerSettings);


    // --- Data Fetching ---

    useEffect(() => {
        // Fetch initial settings from the backend when the component loads
        const fetchSettings = async () => {
            if (!apiUrl) return;
            try {
                // MOCK API CALL: This would fetch all existing settings
                // const response = await fetch(`${apiUrl}/api/shop/get/settings`, { credentials: 'include' });
                // const data = await response.json();

                // Mocking the data for now
                const mockData = {
                    ui: { darkModeDefault: false, billingPageDefault: true, autoPrintInvoice: false },
                    schedulers: {
                        lowStockAlerts: true,
                        autoDeleteNotificationsDays: 45,
                        autoDeleteCustomers: { enabled: true, minSpent: 500, inactiveDays: 120 },
                    },
                };

                setUiSettings(mockData.ui);
                setOriginalUiSettings(mockData.ui);
                setSchedulerSettings(mockData.schedulers);
                setOriginalSchedulerSettings(mockData.schedulers);

            } catch (error) {
                console.error("Failed to fetch settings:", error);
                showAlert("Could not load your current settings.");
            }
        };

        fetchSettings();
    }, [apiUrl, showAlert]);


    // --- Handlers for Account Section ---

    const handlePasswordSubmit = async () => {
        // This entire function is adapted from your UserProfilePage.jsx
        if (passwordStep === 1) {
            try {
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, { method: "GET", credentials: 'include' });
                if (!userRes.ok) throw new Error("Could not fetch user profile.");
                const { username } = await userRes.json();

                const response = await fetch(`${authApiUrl}/auth/authenticate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password: passwordData.currentPassword }),
                });

                if (!response.ok) {
                    showAlert("Invalid current password. Please try again.");
                    return;
                }
                setPasswordStep(2);

            } catch (error) {
                console.error("Error validating password:", error);
                showAlert("Something went wrong while validating password.");
            }
        } else {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                showAlert("New passwords do not match.");
                return;
            }
            if (passwordData.newPassword.length < 4) {
                showAlert("Password must be at least 4 characters long.");
                return;
            }
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/updatepassword`, {
                    method: "POST",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: passwordData.newPassword }),
                });

                if (!response.ok) throw new Error("Failed to update password.");

                showAlert("Password updated successfully!");
                setShowPasswordModal(false);
                setPasswordStep(1);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });

            } catch (error) {
                console.error("Error updating password:", error);
                showAlert("Something went wrong while updating password.");
            }
        }
    };

    const handleCheckUsername = async () => {
        if (!newUsername) {
            setUsernameCheck({ status: false, message: 'Username cannot be empty.' });
            return;
        }
        setIsChecking(true);
        try {



            // --- REAL API CALL for checking username ---
            const response = await fetch(`${apiUrl}/api/shop/user/check-username/${newUsername}`, {
                method: "GET",
                credentials: 'include'
            });
            const result = await response.json();
            // Expected response from backend: { status: boolean, message: string }
            setUsernameCheck(result);



        } catch (error) {
            console.error("Error checking username:", error);
            setUsernameCheck({ status: false, message: 'Error checking username.' });
        } finally {
            setIsChecking(false);
        }
    };

    const handleUpdateUsername = async () => {
        try {

            // --- REAL API CALL for updating username ---
            const response = await fetch(`${apiUrl}/api/shop/user/update-username`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newUsername: newUsername })
            });

            if (!response.ok) throw new Error("Failed to update username.");


            // Mocking success
            showAlert(`Username successfully changed to ${newUsername}!`);
            setShowUsernameModal(false);
            setNewUsername('');
            setUsernameCheck({ status: null, message: '' });

        } catch (error) {
            console.error("Error updating username:", error);
            showAlert("Something went wrong while updating username.");
        }
    };


    // --- Handlers for UI & Schedulers ---

    const handleSaveUiSettings = async () => {
        try {
            /*
            // --- API CALL TO SAVE UI SETTINGS ---
            // Endpoint: PUT /api/shop/update/settings/ui
            // Payload: The 'uiSettings' object
            // {
            //   "darkModeDefault": true,
            //   "billingPageDefault": false,
            //   "autoPrintInvoice": true
            // }
            const response = await fetch(`${apiUrl}/api/shop/update/settings/ui`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(uiSettings),
            });
            if (!response.ok) throw new Error("Server error");
            // Expected Success Response: { status: "success", message: "UI settings updated." }
            */
            showAlert("UI settings saved successfully!");
            setOriginalUiSettings(uiSettings); // Sync original state to hide save button
        } catch (error) {
            console.error("Error saving UI settings:", error);
            showAlert("Failed to save UI settings.");
        }
    };

    const handleSaveSchedulers = async () => {
        try {
            /*
            // --- API CALL TO SAVE SCHEDULER SETTINGS ---
            // Endpoint: PUT /api/shop/update/settings/schedulers
            // Payload: The 'schedulerSettings' object
            // {
            //   "lowStockAlerts": true,
            //   "autoDeleteNotificationsDays": 30,
            //   "autoDeleteCustomers": {
            //     "enabled": false,
            //     "minSpent": 500,
            //     "inactiveDays": 90
            //   }
            // }
            const response = await fetch(`${apiUrl}/api/shop/update/settings/schedulers`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(schedulerSettings),
            });
            if (!response.ok) throw new Error("Server error");
            // Expected Success Response: { status: "success", message: "Scheduler settings updated." }
            */
            showAlert("Scheduler settings saved successfully!");
            setOriginalSchedulerSettings(schedulerSettings); // Sync original state
        } catch (error) {
            console.error("Error saving scheduler settings:", error);
            showAlert("Failed to save scheduler settings.");
        }
    };


    // --- Render Helper: Toggle Switch ---

    const ToggleSwitch = ({ checked, onChange }) => (
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="slider round"></span>
        </label>
    );


    // --- Main Render ---

    return (
        <div className="settings-page">
            <div className="glass-card">
                <h2>Settings</h2>

                {/* ====== ACCOUNT SECTION ====== */}
                <div className="section">
                    <div className="section-header">
                        <h3>Account</h3>
                    </div>
                    <div className="setting-row">
                        <span>Update Password</span>
                        <button className="btn" onClick={() => setShowPasswordModal(true)}>Change</button>
                    </div>
                    <div className="setting-row">
                        <span>Update Username</span>
                        <button className="btn" onClick={() => setShowUsernameModal(true)}>Change</button>
                    </div>
                </div>

                {/* ====== UI SECTION ====== */}
                {/* ====== UI SECTION (VERTICAL LAYOUT) ====== */}
                <div className="section">
                    <div className="section-header">
                        <h3>UI</h3>
                    </div>
                    <div className="setting-item">
                        <label>Select dark mode as default theme</label>
                        <ToggleSwitch
                            checked={uiSettings.darkModeDefault}
                            onChange={(e) => setUiSettings({ ...uiSettings, darkModeDefault: e.target.checked })}
                        />
                    </div>
                    <div className="setting-item">
                        <label>Select Billing Page as default</label>
                        <ToggleSwitch
                            checked={uiSettings.billingPageDefault}
                            onChange={(e) => setUiSettings({ ...uiSettings, billingPageDefault: e.target.checked })}
                        />
                    </div>
                    <div className="setting-item">
                        <label>Directly forward to invoice printing after payment</label>
                        <ToggleSwitch
                            checked={uiSettings.autoPrintInvoice}
                            onChange={(e) => setUiSettings({ ...uiSettings, autoPrintInvoice: e.target.checked })}
                        />
                    </div>
                    {isUiDirty && (
                        <div className="save-button-container">
                            <button className="btn" onClick={handleSaveUiSettings}>Save UI Settings</button>
                        </div>
                    )}
                </div>

                {/* ====== SCHEDULERS SECTION (VERTICAL LAYOUT) ====== */}
                <div className="section">
                    <div className="section-header">
                        <h3>Schedulers</h3>
                    </div>
                    <div className="setting-item">
                        <label>Receive low stock alerts</label>
                        <ToggleSwitch
                            checked={schedulerSettings.lowStockAlerts}
                            onChange={(e) => setSchedulerSettings({ ...schedulerSettings, lowStockAlerts: e.target.checked })}
                        />
                    </div>
                    <div className="setting-item">
                        <label>Auto delete notifications after</label>
                        <div className="input-group">
                            <input
                                type="number"
                                className="small-input"
                                value={schedulerSettings.autoDeleteNotificationsDays}
                                onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteNotificationsDays: Number(e.target.value) })}
                            />
                            <span>days</span>
                        </div>
                    </div>
                    <div className="setting-item">
                        <label>Auto delete customers</label>
                        <ToggleSwitch
                            checked={schedulerSettings.autoDeleteCustomers.enabled}
                            onChange={(e) => setSchedulerSettings({
                                ...schedulerSettings,
                                autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, enabled: e.target.checked }
                            })}
                        />
                        {schedulerSettings.autoDeleteCustomers.enabled && (
                            <div className="indented-controls">
                                <label>Who spent less than an amount and were inactive for a period</label>
                                <div className="input-group">
                                    <span>Spent less than ₹</span>
                                    <input
                                        type="number"
                                        className="small-input"
                                        value={schedulerSettings.autoDeleteCustomers.minSpent}
                                        onChange={(e) => setSchedulerSettings({
                                            ...schedulerSettings,
                                            autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, minSpent: Number(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div className="input-group">
                                    <span>Inactive for</span>
                                    <input
                                        type="number"
                                        className="small-input"
                                        value={schedulerSettings.autoDeleteCustomers.inactiveDays}
                                        onChange={(e) => setSchedulerSettings({
                                            ...schedulerSettings,
                                            autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, inactiveDays: Number(e.target.value) }
                                        })}
                                    />
                                    <span> days</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {isSchedulersDirty && (
                        <div className="save-button-container">
                            <button className="btn" onClick={handleSaveSchedulers}>Save Schedulers</button>
                        </div>
                    )}
                </div>

                {/* ====== MODALS ====== */}
                {showPasswordModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>{passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}</h3>
                            {passwordStep === 1 ? (
                                <div className="form-group"><label>Current Password</label><input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} /></div>
                            ) : (
                                <><div className="form-group"><label>New Password</label><input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></div><div className="form-group"><label>Confirm New Password</label><input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div></>
                            )}
                            <div className="modal-actions">
                                <button className="btn" onClick={handlePasswordSubmit}>{passwordStep === 1 ? 'Validate' : 'Submit'}</button>
                                <button className="btn btn-cancel" onClick={() => { setShowPasswordModal(false); setPasswordStep(1); }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {showUsernameModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Update Username</h3>
                            <div className="form-group">
                                <label>New Username</label>
                                <div className="username-check-wrapper">
                                    <input type="text" value={newUsername} onChange={(e) => { setNewUsername(e.target.value); setUsernameCheck({ status: null, message: '' }); }} />
                                    <button className="btn" onClick={handleCheckUsername} disabled={isChecking}>{isChecking ? '...' : 'Check'}</button>
                                </div>
                                {usernameCheck.message && (
                                    <span className={`username-status ${usernameCheck.status ? 'success' : 'error'}`}>
                                        {usernameCheck.message}
                                    </span>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button className="btn" onClick={handleUpdateUsername} disabled={!usernameCheck.status}>Change</button>
                                <button className="btn btn-cancel" onClick={() => setShowUsernameModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SettingsPage;