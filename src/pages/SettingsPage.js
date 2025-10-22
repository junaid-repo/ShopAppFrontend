// src/pages/SettingsPage.jsx

import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
// Added PaintBrushSquare for the new tab, kept others
import { PaintBrush, Timer, ShoppingCart, Receipt, User, Invoice } from "@phosphor-icons/react";
import toast, { Toaster } from 'react-hot-toast'; // Added toast
import './SettingsPage.css';
import './InvoiceTemplates.css'; // <-- ADDED CSS IMPORT
import './UserProfilePage.css'; // Keep UserProfilePage CSS for modal styles maybe

const SettingsPage = () => {
    const { showAlert } = useAlert();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";

    // --- State for active tab ---
    const [activeTab, setActiveTab] = useState('templates'); // Default to 'templates'

    // --- State Management ---
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // UI Settings
    const [uiSettings, setUiSettings] = useState({
        darkModeDefault: false,
        billingPageDefault: false,
        autoPrintInvoice: false,
    });
    const [originalUiSettings, setOriginalUiSettings] = useState({});
    const isUiDirty = JSON.stringify(uiSettings) !== JSON.stringify(originalUiSettings);

    // Scheduler Settings
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

    // Billing Settings
    const [billingSettings, setBillingSettings] = useState({
        autoSendInvoice: false,
        allowNoStockBilling: false,
        hideNoStockProducts: false,
        serialNumberPattern: '',
    });
    const [originalBillingSettings, setOriginalBillingSettings] = useState({});
    const isBillingDirty = JSON.stringify(billingSettings) !== JSON.stringify(originalBillingSettings);

    // Invoice Settings
    const [invoiceSettings, setInvoiceSettings] = useState({
        addDueDate: false,
        combineAddresses: false,
        showPaymentStatus: false,
        removeTerms: false,
        showCustomerGstin: false,
    });
    const [originalInvoiceSettings, setOriginalInvoiceSettings] = useState({});
    const isInvoiceDirty = JSON.stringify(invoiceSettings) !== JSON.stringify(originalInvoiceSettings);

    // --- COPIED: Define your invoice templates ---
    const invoiceTemplates = [
        { name: 'gstinvoiceskyblue', displayName: 'Modern Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235059.png' },
        { name: 'gstinvoiceLightGreen', displayName: 'Elegant Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235119.png' },
        { name: 'gstinvoiceGreen', displayName: 'Simple Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235133.png' },
        { name: 'gstinvoiceBlue', displayName: 'Simple Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235150.png' },
        { name: 'gstinvoiceOrange', displayName: 'Classic Orange', imageUrl: '/invoiceTemplates/Screenshot_20251019_235203.png' },
        { name: 'gstinvoice', displayName: 'Best Purple', imageUrl: '/invoiceTemplates/Screenshot_20251019_235220.png' },
    ];

    // --- COPIED: State for Invoice Templates ---
    const [selectedTemplate, setSelectedTemplate] = useState(''); // Store the *name*
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTemplate, setModalTemplate] = useState(null); // Store the template *object*

    // --- Data Fetching ---
    useEffect(() => {
        const fetchSettings = async () => {
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/get/user/settings`, { credentials: 'include' });
                if (!response.ok) throw new Error("Could not load settings");
                const data = await response.json();

                // Existing settings load - use empty object as fallback
                setUiSettings(data.ui || {});
                setOriginalUiSettings(data.ui || {});
                setSchedulerSettings(data.schedulers || {});
                setOriginalSchedulerSettings(data.schedulers || {});
                setBillingSettings(data.billing || {});
                setOriginalBillingSettings(data.billing || {});
                setInvoiceSettings(data.invoice || {});
                setOriginalInvoiceSettings(data.invoice || {});

            } catch (error) {
                console.error("Failed to fetch settings:", error);
                showAlert("Could not load your general settings.");
            }
        };

        // --- COPIED & INTEGRATED: Fetch selected template ---
        const fetchSelectedTemplate = async () => {
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/get/user/invoiceTemplate`, {
                    method: 'GET',
                    credentials: 'include',
                });
                if (response.ok) {
                    const data = await response.json();
                    setSelectedTemplate(data.selectedTemplateName || '');
                } else {
                    console.warn("Failed to fetch selected template:", response.status);
                    setSelectedTemplate(''); // Ensure it's cleared on failure
                }
            } catch (error) {
                console.error("Error fetching selected template:", error);
                setSelectedTemplate(''); // Ensure it's cleared on error
            }
        };

        fetchSettings();
        fetchSelectedTemplate(); // Fetch template after general settings
    }, [apiUrl, showAlert]); // Dependencies


    // --- Handlers ---
    const handlePasswordSubmit = async () => {
        // ... (password submit logic remains the same)
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

    // Generic save handler
    const createSaveHandler = (endpoint, settings, setOriginalSettings, settingsName) => async () => {
        // ... (generic save handler remains the same)
        try {
            const response = await fetch(`${apiUrl}/api/shop/settings/user/save/${endpoint}`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error("Server error");
            showAlert(`${settingsName} settings saved successfully!`);
            setOriginalSettings(settings);
        } catch (error) {
            console.error(`Error saving ${settingsName} settings:`, error);
            showAlert(`Failed to save ${settingsName} settings.`);
        }
    };

    const handleSaveUiSettings = createSaveHandler('ui', uiSettings, setOriginalUiSettings, 'UI');
    const handleSaveSchedulers = createSaveHandler('scheduler', schedulerSettings, setOriginalSchedulerSettings, 'Scheduler');
    const handleSaveBillingSettings = createSaveHandler('billing', billingSettings, setOriginalBillingSettings, 'Billing');
    const handleSaveInvoiceSettings = createSaveHandler('invoice', invoiceSettings, setOriginalInvoiceSettings, 'Invoice');

    // --- COPIED: Handler for selecting a template ---
    const handleSelectTemplate = async (templateName, displayName) => {
        if (!apiUrl) { // Removed user check as settings might not depend on specific user state here
            toast.error("Cannot save selection. API configuration missing.");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/shop/user/save/user/invoiceTemplate`, {
                method: 'POST', // Or PUT
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedTemplateName: templateName }),
            });

            if (response.ok) {
                setSelectedTemplate(templateName);
                toast.success(`Template "${displayName}" selected!`);
                setModalOpen(false); // Close modal if selection was made from modal
            } else {
                toast.error(`Failed to select template: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Error selecting template:", error);
            toast.error("Something went wrong while saving your selection.");
        }
    };

    // --- COPIED: Handlers for modal ---
    const openTemplateModal = (template) => {
        setModalTemplate(template);
        setModalOpen(true);
    };

    const closeTemplateModal = () => {
        setModalOpen(false);
        setModalTemplate(null);
    };


    // --- Render Helper: Toggle Switch ---
    const ToggleSwitch = ({ checked, onChange }) => (
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="slider round"></span>
        </label>
    );

    // --- Main Render ---
    return (<div className="settings-page">
        <Toaster position="top-center" toastOptions={{
            duration: 5000,
            style: {
                background: 'lightgreen',
                color: 'var(--text-color)',
                borderRadius: '25px',
                padding: '12px',
                width: '120%',
                minWidth: '250px',
                fontSize: '16px',
            },
        }}   reverseOrder={false} />

        <div className="glass-card" style={{ maxWidth: '1100px', marginTop: '50px' }}>
            <h1 style={{ textAlign: 'left', marginBottom: '55px' }}>Settings</h1>

            {/* ====== TAB NAVIGATION (Invoice Template First) ====== */}
            <div className="settings-tab-nav">
                <button
                    className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    <Invoice weight="duotone" /> Templates {/* New Icon */}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ui' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ui')}
                >
                    <PaintBrush weight="duotone" /> UI
                </button>
                <button
                    className={`tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
                    onClick={() => setActiveTab('billing')}
                >
                    <ShoppingCart weight="duotone" /> Billing
                </button>
                <button
                    className={`tab-btn ${activeTab === 'invoice' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invoice')}
                >
                    <Receipt weight="duotone" /> Invoice
                </button>
                <button
                    className={`tab-btn ${activeTab === 'schedulers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schedulers')}
                >
                    <Timer weight="duotone" /> Schedulers
                </button>
                <button
                    className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveTab('account')}
                >
                    <User weight="duotone" /> Account
                </button>
            </div>

            {/* ====== TAB CONTENT AREA ====== */}
            <div className="settings-tab-content">

                {/* --- ADDED: INVOICE TEMPLATES TAB PANE --- */}
                {activeTab === 'templates' && (
                    <div className="tab-pane invoice-templates-tab"> {/* Added specific class */}
                        {/* No header needed inside pane */}
                        <h3>Select Your Invoice Template</h3>
                        <p>Choose the design you prefer for your generated invoices.</p>
                        <div className="template-grid">
                            {invoiceTemplates.map((template) => (
                                <div
                                    key={template.name}
                                    className={`template-card ${selectedTemplate === template.name ? 'selected' : ''}`}
                                >
                                    <img
                                        src={template.imageUrl}
                                        alt={template.displayName}
                                        onClick={() => openTemplateModal(template)}
                                        className="template-image"
                                    />
                                    <div className="template-info">
                                        <span className="template-name">{template.displayName}</span>
                                        <button
                                            className="btn select-btn"
                                            onClick={() => handleSelectTemplate(template.name, template.displayName)}
                                            disabled={selectedTemplate === template.name}
                                        >
                                            {selectedTemplate === template.name ? 'Selected' : 'Select'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ====== ACCOUNT TAB PANE ====== */}
                {activeTab === 'account' && (
                    <div className="tab-pane">
                        <div className="setting-row">
                            <span>Update Password</span>
                            <button className="btn" onClick={() => setShowPasswordModal(true)}>Change</button>
                        </div>
                    </div>
                )}

                {/* ====== UI TAB PANE ====== */}
                {activeTab === 'ui' && (
                    <div className="tab-pane">
                        {/* ... UI settings content ... */}
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={uiSettings.darkModeDefault}
                                    onChange={(e) => setUiSettings({ ...uiSettings, darkModeDefault: e.target.checked })}
                                />
                                <label>Select dark mode as default theme</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={uiSettings.billingPageDefault}
                                    onChange={(e) => setUiSettings({ ...uiSettings, billingPageDefault: e.target.checked })}
                                />
                                <label>Select Billing Page as default</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={uiSettings.autoPrintInvoice}
                                    onChange={(e) => setUiSettings({ ...uiSettings, autoPrintInvoice: e.target.checked })}
                                />
                                <label>Directly forward to invoice printing after payment</label>
                            </div>
                        </div>
                        {isUiDirty && (
                            <div className="save-button-container">
                                <button className="btn" onClick={handleSaveUiSettings}>Save UI Settings</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ====== BILLING TAB PANE ====== */}
                {activeTab === 'billing' && (
                    <div className="tab-pane">
                        {/* ... Billing settings content ... */}
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={billingSettings.autoSendInvoice}
                                    onChange={(e) => setBillingSettings({ ...billingSettings, autoSendInvoice: e.target.checked })}
                                />
                                <label>Automatic send invoice after billing</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={billingSettings.allowNoStockBilling}
                                    onChange={(e) => setBillingSettings({ ...billingSettings, allowNoStockBilling: e.target.checked })}
                                />
                                <label>Allow to create sales invoices even if stock is not available</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={billingSettings.hideNoStockProducts}
                                    onChange={(e) => setBillingSettings({ ...billingSettings, hideNoStockProducts: e.target.checked })}
                                />
                                <label>Hide out of stock products from product list when Billing</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <label>Enter serial number pattern (Max 5)</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="small-input"
                                    maxLength={5}
                                    value={billingSettings.serialNumberPattern}
                                    onChange={(e) => setBillingSettings({ ...billingSettings, serialNumberPattern: e.target.value })}
                                />
                            </div>
                        </div>
                        {isBillingDirty && (
                            <div className="save-button-container">
                                <button className="btn" onClick={handleSaveBillingSettings}>Save Billing Settings</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ====== INVOICE TAB PANE ====== */}
                {activeTab === 'invoice' && (
                    <div className="tab-pane">
                        {/* ... Invoice settings content ... */}
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={invoiceSettings.addDueDate}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, addDueDate: e.target.checked })}
                                />
                                <label>Add Due Date option on invoice</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={invoiceSettings.combineAddresses}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, combineAddresses: e.target.checked })}
                                />
                                <label>Combine Ship To and Bill To as 'Bill To'</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={invoiceSettings.showPaymentStatus}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showPaymentStatus: e.target.checked })}
                                />
                                <label>Add Payment Received and Payment Due in the Invoice</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={invoiceSettings.removeTerms}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, removeTerms: e.target.checked })}
                                />
                                <label>Remove Terms and Conditions from the invoice</label>
                            </div>
                        </div>
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={invoiceSettings.showCustomerGstin}
                                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showCustomerGstin: e.target.checked })}
                                />
                                <label>Show Customer GSTIN on invoice</label>
                            </div>
                        </div>
                        {isInvoiceDirty && (
                            <div className="save-button-container">
                                <button className="btn" onClick={handleSaveInvoiceSettings}>Save Invoice Settings</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ====== SCHEDULERS TAB PANE ====== */}
                {activeTab === 'schedulers' && (
                    <div className="tab-pane">
                        {/* ... Schedulers settings content ... */}
                        <div className="setting-item">
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={schedulerSettings.lowStockAlerts}
                                    onChange={(e) => setSchedulerSettings({ ...schedulerSettings, lowStockAlerts: e.target.checked })}
                                />
                                <label>Receive low stock alerts</label>
                            </div>
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
                            <div className="setting-toggle">
                                <ToggleSwitch
                                    checked={schedulerSettings.autoDeleteCustomers.enabled}
                                    onChange={(e) => setSchedulerSettings({
                                        ...schedulerSettings,
                                        autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, enabled: e.target.checked }
                                    })}
                                />
                                <label>Auto delete customers</label>
                            </div>
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

            {/* --- COPIED: Template Modal --- */}
            {modalOpen && modalTemplate && (
                <div className="template-modal-overlay" onClick={closeTemplateModal}>
                    <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={closeTemplateModal}>&times;</button>
                        <img src={modalTemplate.imageUrl} alt={modalTemplate.displayName} className="modal-image-full"/>
                        <h4>{modalTemplate.displayName}</h4>
                        <button
                            className="btn select-btn-modal"
                            onClick={() => handleSelectTemplate(modalTemplate.name, modalTemplate.displayName)}
                            disabled={selectedTemplate === modalTemplate.name}
                        >
                            {selectedTemplate === modalTemplate.name ? 'Currently Selected' : 'Select This Template'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>);
};

export default SettingsPage;