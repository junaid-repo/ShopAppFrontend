import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal'; // <-- 1. IMPORT MODAL

// Import the stylesheet (we'll add new styles for this layout)
import './ReportsPage.css';

// --- Report Data (Unchanged) ---
const DOMAIN_REPORTS = {
    gst: [

        { id: 'statewisegst', name: 'SateWiseGST Summary', icon: 'fa-duotone fa-solid fa-truck-fast' },
        { id: 'customerwisegst', name: 'CustomerWiseGST Summary', icon: 'fa-duotone fa-solid fa-user' },
        { id: 'gstr-1', name: 'GSTR-1 Summary', icon: 'fa-duotone fa-solid fa-file-invoice' },
        { id: 'hsn-sac', name: 'HSN/SAC Summary', icon: 'fa-duotone fa-solid fa-barcode-read' },
    ],
    sales: [
        { id: 'sales-summary', name: 'Sales Summary', icon: 'fa-duotone fa-solid fa-chart-mixed' },
        { id: 'sales-by-product', name: 'Sales by Product', icon: 'fa-duotone fa-solid fa-box' },
        { id: 'sales-by-customer', name: 'Sales by Customer', icon: 'fa-duotone fa-solid fa-users' },
    ],
    payments: [
        { id: 'payment-received', name: 'Total Payments', icon: 'fa-duotone fa-solid fa-credit-card' },
        { id: 'payment-status', name: 'Payment Status', icon: 'fa-duotone fa-solid fa-money-check-dollar-pen' },
        { id: 'payment-mode', name: 'Payment Modes', icon: 'fa-duotone fa-solid fa-qrcode' },
    ],
    product: [
        { id: 'stock-summary', name: 'Stock Summary', icon: 'fa-duotone fa-solid fa-boxes-stacked' },
        { id: 'low-stock', name: 'Low Stock Report', icon: 'fa-duotone fa-solid fa-triangle-exclamation' },
    ],
    customers: [
        { id: 'customer-outstanding', name: 'Customer Outstanding', icon: 'fa-duotone fa-solid fa-user-clock' },
        { id: 'customer-ledger', name: 'Customer Ledger', icon: 'fa-duotone fa-solid fa-book-user' },
    ],
};

const REPORT_ICON_MAP = Object.values(DOMAIN_REPORTS)
    .flat()
    .reduce((acc, report) => {
        acc[report.name] = report.icon;
        return acc;
    }, {});

// --- Utilities (Unchanged) ---
function addMonths(date, n) { /* ... */ }
function isRangeWithin12Months(fromISO, toISO) { /* ... */ }
function formatRange(fromISO, toISO) { /* ... */ }
function timeAgo(iso) { /* ... */ }

// --- Mock API (Unchanged) ---
async function mockFetchRecentReports({ limit = 10 } = {}, apiUrl) {
    // Using your existing fetch logic
    try {
        const response = await fetch(apiUrl + "/api/shop/report/recent?limit=10", {
            method: "GET",
            credentials: 'include',
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
            return { success: true, reports: data.slice(0, limit) };
        }
        if (data && data.reports) {
            return { success: true, reports: data.reports.slice(0, limit) };
        }
        return { success: false, reports: [] };
    } catch (error) {
        console.error("Failed to fetch recent reports:", error);
        // Fallback seed data
        const seed = [
            { id: 'rpt_001', name: 'Sales Summary', fromDate: '2025-01-01', toDate: '2025-03-31', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), fileName: 'sales_2025Q1.pdf' },
            { id: 'rpt_002', name: 'Stock Summary', fromDate: '2025-06-01', toDate: '2025-06-30', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), fileName: 'product_jun_2025.csv' },
            { id: 'rpt_003', name: 'Payments Received', fromDate: '2025-07-01', toDate: '2025-07-31', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), fileName: 'payments_jul_2025.xlsx' },
        ];
        return { success: true, reports: seed.slice(0, limit) };
    }
}

// --- Excel Preview Component (Unchanged) ---
function ExcelPreview({ data }) {
    if (!data || data.length === 0) {
        return <div className="preview-placeholder"><p>No data to display in this file.</p></div>;
    }

    const header = data[0];
    const rows = data.slice(1);

    return (
        <div className="excel-preview-container">
            <table className="excel-preview-table">
                <thead>
                <tr>
                    {header.map((cell, i) => (
                        <th key={i}>{cell}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>
                        {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

// --- 1. NEW: Helper for Base64 conversion ---
const fileReaderAsync = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


// --- Component ---
const ReportsPage = () => {

    const { showAlert } = useAlert();

    function getTodayISO() {
        return new Date().toISOString().slice(0, 10);
    }
    function getPastISO(days) {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().slice(0, 10);
    }

    const [fromDate, setFromDate] = useState(getPastISO(30));
    const [toDate, setToDate] = useState(getTodayISO());
    const [domain, setDomain] = useState('sales');
    const [selectedReport, setSelectedReport] = useState(null);
    const [format, setFormat] = useState('excel');
    const [previewData, setPreviewData] = useState({ blob: null, name: null, url: null });
    const [recentReports, setRecentReports] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [excelData, setExcelData] = useState(null);

    // --- 2. NEW: State for Email Modal ---
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    const availableReports = useMemo(() => {
        return DOMAIN_REPORTS[domain] || [];
    }, [domain]);

    useEffect(() => {
        setSelectedReport(null);
    }, [domain]);

    // --- 1. NEW: Helper to clear cache ---
    const clearReportCache = () => {
        // Clean up old excel blob url
        if (previewData.url && format === 'excel' && previewData.url.startsWith('blob:')) {
            window.URL.revokeObjectURL(previewData.url);
        }
        sessionStorage.removeItem('reportCache');
    };

    // --- UPDATED: Load recent reports AND cached report ---
    useEffect(() => {
        let mounted = true;
        setLoadingRecent(true);
        mockFetchRecentReports({ limit: 10 }, apiUrl)
            .then((res) => {
                if (mounted && res.success) setRecentReports(res.reports);
            })
            .catch(() => {
                showAlert('Failed to fetch recent reports.');
            })
            .finally(() => {
                if (mounted) setLoadingRecent(false);
            });

        // --- 1. NEW: Load cached report from sessionStorage ---
        const loadCache = async () => {
            const cached = sessionStorage.getItem('reportCache');
            if (cached) {
                try {
                    const data = JSON.parse(cached);

                    // Restore filters
                    setFromDate(data.fromDate);
                    setToDate(data.toDate);
                    setDomain(data.domain);
                    setFormat(data.format);

                    // Find and set selectedReport
                    const allReports = Object.values(DOMAIN_REPORTS).flat();
                    const report = allReports.find(r => r.id === data.selectedReportId);
                    if(report) setSelectedReport(report);

                    // Restore preview data
                    if (data.excelData) {
                        setExcelData(data.excelData);
                    }

                    if (data.fileBase64) {
                        // Re-create blob from Base64
                        const res = await fetch(data.fileBase64);
                        const blob = await res.blob();
                        setPreviewData({
                            blob: blob,
                            name: data.name,
                            // For PDF, use the Base64 data URL. For Excel, create a new blob URL.
                            url: data.format === 'pdf' ? data.fileBase64 : window.URL.createObjectURL(blob)
                        });
                    }
                } catch (err) {
                    console.error("Failed to load cached report", err);
                    sessionStorage.removeItem('reportCache'); // Clear bad cache
                }
            }
        };
        loadCache();

        return () => (mounted = false);
    }, [apiUrl, showAlert]); // Only run on mount

    const validationError = useMemo(() => { /* ... */ }, [fromDate, toDate]);
    const canGenerate = fromDate && toDate && selectedReport && format && !validationError && !isGenerating;

    const handleDownload = () => { /* ... */ };

    // --- MODIFIED: onGenerate (to save to cache) ---
    const onGenerate = async (e) => {
        e.preventDefault();
        if (!canGenerate) return;

        setIsGenerating(true);
        clearReportCache(); // Clear old cache before generating new

        // Clear local state
        setPreviewData({ blob: null, name: null, url: null });
        setExcelData(null);

        try {
            const payload = {
                reportType: selectedReport.name,
                reportId: selectedReport.id,
                domain: domain,
                format: format,
                fromDate,
                toDate
            };
            console.log("Generate Report - Payload:", payload);

            const response = await fetch(apiUrl + "/api/shop/report", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to generate report");
            }

            const blob = await response.blob();
            const now = new Date();
            const dateTimeStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
            const extension = format === 'excel' ? 'xlsx' : 'pdf';
            const cleanExt = extension.replace(/^\.+/, ""); // This was the fix
            const clean = str => str.replace(/\.+$/, "");
            const pureFileName = `${clean(selectedReport.name.replace(/\s+/g, '_'))}_${clean(dateTimeStr)}.${cleanExt}`;

            // --- 1. NEW CACHE & PREVIEW LOGIC ---
            const fileBase64 = await fileReaderAsync(blob); // Convert blob to Base64
            let excelJson = null;
            let previewUrl = fileBase64; // For PDF, the base64 URL is the preview

            if (format === 'excel') {
                const buffer = await blob.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                excelJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                setExcelData(excelJson);
                previewUrl = window.URL.createObjectURL(blob); // For Excel, create a blob URL
            }

            setPreviewData({ blob: blob, name: pureFileName, url: previewUrl });

            // Save to sessionStorage
            sessionStorage.setItem('reportCache', JSON.stringify({
                fromDate,
                toDate,
                domain,
                selectedReportId: selectedReport.id,
                format,
                name: pureFileName,
                fileBase64: fileBase64, // Store Base64
                excelData: excelJson    // Store Excel JSON
            }));
            // --- END CACHE LOGIC ---

            // --- Update Recent Reports (unchanged) ---
            setRecentReports(prev => [
                {
                    id: Date.now(),
                    name: selectedReport.name,
                    fromDate,
                    toDate,
                    createdAt: now.toISOString(),
                    fileName: pureFileName,
                },
                ...prev
            ].slice(0, 10));

            // --- Save Details (unchanged) ---
            const saveReportPayload = {
                reportType: selectedReport.name,
                fromDate,
                toDate,
                generatedAt: now.toISOString(),
                fileName: pureFileName
            };

            await fetch(apiUrl + "/api/shop/report/saveDetails", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(saveReportPayload)
            });

        } catch (err) {
            console.error(err);
            showAlert("Something went wrong while generating the report.");
        } finally {
            setIsGenerating(false);
        }
    };

    const getReportIcon = (reportName) => {
        return REPORT_ICON_MAP[reportName] || 'fa-duotone fa-solid fa-file-lines';
    };

    return (
        <div className="page-container reports-page">
            <div className="reports-main-layout">

                {/* --- 1. Left Column: Filters (Unchanged) --- */}
                <div className="report-column report-filters">
                    <form onSubmit={onGenerate} className="report-filter-form">
                        <h3>Generate Report</h3>

                        <div className="form-group">
                            <label>From date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>To date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                required
                            />
                        </div>

                        {validationError && (
                            <p className="validation-error">{validationError}</p>
                        )}

                        <div className="form-group">
                            <label>Domain</label>
                            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                                <option value="gst">GST</option>
                                <option value="sales">Sales</option>
                                <option value="payments">Payments</option>
                                <option value="product">Product</option>
                                <option value="customers">Customers</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Report Type</label>
                            <div className="report-type-list">
                                {availableReports.length > 0 ? (
                                    availableReports.map(report => (
                                        <button
                                            type="button"
                                            key={report.id}
                                            className={`report-type-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <i className={report.icon}></i>
                                            <span>{report.name}</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="report-type-empty">No reports in this domain.</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Format</label>
                            <select value={format} onChange={(e) => setFormat(e.target.value)}>
                                <option value="excel">Excel (XLSX)</option>
                                <option value="pdf">PDF</option>
                            </select>
                        </div>

                        <button type="submit" className="btn btn-generate" disabled={!canGenerate}>
                            {isGenerating ? 'Generating…' : 'Generate Report'}
                        </button>
                    </form>
                </div>

                {/* --- 2. Middle Column: Preview (UPDATED) --- */}
                <div className="report-column report-preview">
                    <div className="report-preview-header">
                        <h4>Report Preview</h4>
                        {/* --- 2. NEW BUTTONS WRAPPER --- */}
                        <div className="preview-actions">
                            <button
                                className="btn btn-email" // New class
                                onClick={() => setIsEmailModalOpen(true)}
                                disabled={!previewData.blob}
                            >
                                <i className="fa-solid fa-paper-plane"></i>
                                Email
                            </button>
                            <button
                                className="btn btn-download"
                                onClick={handleDownload}
                                disabled={!previewData.url}
                            >
                                <i className="fa-solid fa-download"></i>
                                Download
                            </button>
                        </div>
                    </div>
                    {/* --- Preview Content (Unchanged) --- */}
                    <div className="report-preview-content">
                        {isGenerating ? (
                            <div className="preview-placeholder">
                                <p>Generating your report, please wait...</p>
                            </div>
                        ) : format === 'pdf' && previewData.url ? (
                            <iframe
                                src={previewData.url}
                                title="Report Preview"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                            ></iframe>
                        ) : format === 'excel' && excelData ? (
                            <ExcelPreview data={excelData} />
                        ) : (
                            <div className="preview-placeholder">
                                <i className="fa-duotone fa-solid fa-file-chart-pie"></i>
                                <p>Your generated report preview will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- 3. Right Column: Recent (Unchanged) --- */}
                <div className="report-column report-recent">
                    <h3>Recent Reports</h3>
                    <div className="recent-reports-list">
                        {loadingRecent ? (
                            <p>Loading recent reports…</p>
                        ) : recentReports.length === 0 ? (
                            <p>No reports generated yet.</p>
                        ) : (
                            <ul>
                                {recentReports.map(r => (
                                    <li key={r.id} className="recent-report-item">
                                        <div className="recent-report-icon">
                                            <i className={getReportIcon(r.name)}></i>
                                        </div>
                                        <div className="recent-report-details">
                                            <span className="recent-report-name">{r.name}</span>
                                            <span className="recent-report-duration">{formatRange(r.fromDate, r.toDate)}</span>
                                            <span className="recent-report-time">{timeAgo(r.createdAt)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div> {/* .reports-main-layout */}

            {/* --- 2. NEW EMAIL MODAL RENDER --- */}
            {isEmailModalOpen && (
                <EmailModal
                    show={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    apiUrl={apiUrl}
                    showAlert={showAlert}
                    reportBlob={previewData.blob}
                    reportName={previewData.name}
                />
            )}

        </div> /* .page-container */
    );
};


// --- 2. NEW EMAIL MODAL COMPONENT ---
// This component is added to the same file to keep things simple
const EmailModal = ({ show, onClose, apiUrl, showAlert, reportBlob, reportName }) => {

    const [emailList, setEmailList] = useState([]);
    const [currentEmail, setCurrentEmail] = useState("");
    const [isSending, setIsSending] = useState(false);

    const validateEmail = (email) => {
        // Basic email validation regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleAddEmail = () => {
        const email = currentEmail.trim();

        if (emailList.length >= 10) {
            showAlert("You can add at most 10 email addresses.", "error");
            return;
        }
        if (email && validateEmail(email) && !emailList.includes(email)) {
            setEmailList([...emailList, email]);
            setCurrentEmail("");
        } else if (email && !validateEmail(email)) {
            showAlert("Please enter a valid email address.", "error");
        } else if (emailList.includes(email)) {
            showAlert("Email already in the list.", "warning");
        }
    };

    const handleEmailInputKeyDown = (e) => {
        // Add email on Enter, Comma, or Space
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            handleAddEmail();
        }
    };

    const removeEmail = (emailToRemove) => {
        setEmailList(emailList.filter(email => email !== emailToRemove));
    };

    const handleSend = async () => {
        if (emailList.length === 0) {
            // Check if there's a valid email in the input field
            if(validateEmail(currentEmail.trim())) {
                await handleAddEmail(); // Add it first
            } else {
                showAlert("Please add at least one valid email address.", "error");
                return;
            }
        }

        // Check again after potentially adding the last email
        if (emailList.length === 0 && !validateEmail(currentEmail.trim())) {
            showAlert("Please add at least one valid email address.", "error");
            return;
        }

        // If the user typed an email but didn't press Enter, add it now.
        const lastEmail = currentEmail.trim();
        let finalEmailList = emailList;
        if (lastEmail && validateEmail(lastEmail) && !emailList.includes(lastEmail)) {
            finalEmailList = [...emailList, lastEmail];
        }

        if (finalEmailList.length === 0) {
            showAlert("Please add at least one valid email address.", "error");
            return;
        }

        setIsSending(true);
        const formData = new FormData();
        formData.append('file', reportBlob, reportName);
        formData.append('subject', `Report: ${reportName}`);
        formData.append('to', finalEmailList.join(',')); // Send as comma-separated list

        try {
            const response = await fetch(`${apiUrl}/api/shop/report/email`, {
                method: 'POST',
                credentials: 'include',
                body: formData, // No Content-Type header needed, browser sets it
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to send email.");
            }

            showAlert("Report sent successfully!", "success");
            onClose();

        } catch (err) {
            console.error("Email send error:", err);
            showAlert(err.message || "Something went wrong while sending the email.", "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal title="Email Report" show={show} onClose={onClose}>
            <div className="email-modal-content">
                <div className="form-group">
                    <label>To:</label>
                    <div className="email-chip-container" onClick={() => document.getElementById('email-input').focus()}>
                        {emailList.map(email => (
                            <div key={email} className="email-chip">
                                {email}
                                <button onClick={() => removeEmail(email)}>&times;</button>
                            </div>
                        ))}
                        <input
                            id="email-input"
                            type="email"
                            value={currentEmail}
                            onChange={(e) => setCurrentEmail(e.target.value)}
                            onKeyDown={handleEmailInputKeyDown}
                            placeholder={emailList.length === 0 ? "Enter email and press Enter..." : ""}
                            disabled={emailList.length >= 10}
                        />
                    </div>
                    {emailList.length >= 10 && (
                        <small className="validation-error">Maximum of 10 emails reached.</small>
                    )}
                </div>
                <div className="form-group">
                    <label>Subject:</label>
                    <input type="text" value={reportName ? `Report: ${reportName}` : 'Report'} readOnly disabled />
                </div>
                <div className="form-actions">
                    <button className="btn" onClick={handleSend} disabled={isSending}>
                        {isSending ? "Sending..." : "Send"}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSending}>
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ReportsPage;