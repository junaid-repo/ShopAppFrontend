import React, { useEffect, useMemo, useState, useRef } from 'react';
// NEW: Removed ReactDOM, it's not needed for the preview
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
import * as XLSX from 'xlsx';

// Import the stylesheet (we'll add new styles for this layout)
import './ReportsPage.css';

// --- Report Data (NEW) ---
// We define the reports available for each domain
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

// NEW: A combined map to find icons by name for the 'Recent' list
const REPORT_ICON_MAP = Object.values(DOMAIN_REPORTS)
    .flat()
    .reduce((acc, report) => {
        acc[report.name] = report.icon;
        return acc;
    }, {});

const userName = "junaid";


// --- Utilities (Kept from your original file) ---
function addMonths(date, n) {
    const d = new Date(date);
    const targetMonth = d.getMonth() + n;
    d.setMonth(targetMonth);
    if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
        d.setDate(0);
    }
    return d;
}

function isRangeWithin12Months(fromISO, toISO) {
    if (!fromISO || !toISO) return true;
    const from = new Date(fromISO + 'T00:00:00');
    const to = new Date(toISO + 'T23:59:59');
    if (to < from) return false;
    const limit = addMonths(from, 12);
    return to <= limit;
}

function formatRange(fromISO, toISO) {
    if (!fromISO || !toISO) return '';
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };
    const f = new Date(fromISO);
    const t = new Date(toISO);
    return `${f.toLocaleDateString('en-GB', opts)} — ${t.toLocaleDateString('en-GB', opts)}`;
}

function timeAgo(iso) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.max(0, now - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    const y = Math.floor(mo / 12);
    return `${y}y ago`;
}

// --- Mock API (Kept from your original file) ---
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

// --- NEW: Excel Preview Component (Moved to correct scope) ---
// --- UPDATED: Excel Preview Component ---
function ExcelPreview({ data }) {
    if (!data || data.length === 0) {
        return <div className="preview-placeholder"><p>No data to display in this file.</p></div>;
    }

    // Use the first row as the header
    const header = data[0];
    const rows = data.slice(1);


    return (
        // The 'style' prop has been removed from this div
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

// --- Component ---
const ReportsPage = () => {

    const { showAlert } = useAlert();

    // --- NEW State for 3-column layout ---
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
    const [domain, setDomain] = useState('sales'); // NEW: Default to 'sales'
    const [selectedReport, setSelectedReport] = useState(null); // NEW: No report selected initially
    const [format, setFormat] = useState('excel'); // NEW: PDF or excel
    const [previewData, setPreviewData] = useState({ blob: null, name: null, url: null }); // NEW: For preview
    const [recentReports, setRecentReports] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [excelData, setExcelData] = useState(null);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    // NEW: Get the list of reports for the currently selected domain
    const availableReports = useMemo(() => {
        return DOMAIN_REPORTS[domain] || [];
    }, [domain]);

    // NEW: Reset selected report when domain changes
    useEffect(() => {
        setSelectedReport(null); // Deselect report when domain changes
    }, [domain]);

    // Load recent reports (Adapted from your original)
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
        return () => (mounted = false);
    }, [apiUrl, showAlert]); // Dependency on apiUrl and showAlert

    // Validation (Adapted from your original)
    const validationError = useMemo(() => {
        if (!fromDate || !toDate) return '';
        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (to < from) return 'To date cannot be before From date.';
        if (!isRangeWithin12Months(fromDate, toDate)) return 'Date range cannot exceed 12 months.';
        return '';
    }, [fromDate, toDate]);

    // NEW: Updated check for 'Generate' button
    const canGenerate = fromDate && toDate && selectedReport && format && !validationError && !isGenerating;

    // --- NEW: Download handler for the preview button ---
    const handleDownload = () => {
        if (!previewData.url || !previewData.name) {
            showAlert("No report preview to download.", "error");
            return;
        }
        const a = document.createElement("a");
        a.href = previewData.url;
        a.download = previewData.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Note: We don't revoke the URL, so the iframe preview stays active
    };

    // --- MODIFIED: onGenerate ---
    // Now sets preview data instead of downloading directly
    const onGenerate = async (e) => {
        e.preventDefault();
        if (!canGenerate) return;

        setIsGenerating(true);

        // NEW: Clean up old preview URL before fetching a new one
        if (previewData.url) {
            window.URL.revokeObjectURL(previewData.url);
        }
        setPreviewData({ blob: null, name: null, url: null }); // Clear previous preview
        setExcelData(null); // <-- UPDATED: Clear previous excel data

        try {
            const payload = {
                reportType: selectedReport.name, // Send the name
                reportId: selectedReport.id,   // Send the ID
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
            const url = window.URL.createObjectURL(blob); // Create URL for preview
            const now = new Date();

            // Format filename (from your original logic)
            const dateTimeStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
            // UPDATED: Handle 'excel' value correctly
            const extension = format === 'excel' ? 'xlsx' : 'pdf';
            const cleanExt = extension.replace(/^\.+/, "");
            const clean = str => str.replace(/\.+$/, "");
            const pureFileName = `${clean(selectedReport.name.replace(/\s+/g, '_'))}_${clean(dateTimeStr)}.${cleanExt}`;

            // --- NEW: Set data for preview ---
            // Always set previewData for the download button
            setPreviewData({ blob, name: pureFileName, url });

            if (format === 'pdf') {
                // For PDF, set the URL for the iframe
                setExcelData(null); // Clear any old excel data
            } else if (format === 'excel') {
                // For Excel, read the blob to show a preview
                const buffer = await blob.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // Convert sheet to an array of arrays (e.g., [ ['Name', 'Age'], ['John', 30] ])
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                setExcelData(json);
            }
            // --- !!! END OF NEW LOGIC !!! ---

            // --- Update Recent Reports (from your original logic) ---
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

            // --- Save Details (from your original logic) ---
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

            // We DO NOT revoke the URL here, as the iframe needs it
            // window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error(err);
            showAlert("Something went wrong while generating the report.");
        } finally {
            setIsGenerating(false);
        }
    };


    // NEW: Helper to get icon class for a report name
    const getReportIcon = (reportName) => {
        return REPORT_ICON_MAP[reportName] || 'fa-duotone fa-solid fa-file-lines'; // Fallback
    };

    // --- NEW 3-Column Render ---
    return (
        <div className="page-container reports-page">
            {/* We remove the <h2>Reports</h2> title to give more space */}

            {/* NEW: Main 3-column layout container */}
            <div className="reports-main-layout">

                {/* --- 1. Left Column: Filters (1/3) --- */}
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
                                {/* --- UPDATED: Fixed typo valueD -> value --- */}

                            </select>
                        </div>

                        <button type="submit" className="btn btn-generate" disabled={!canGenerate}>
                            {isGenerating ? 'Generating…' : 'Generate Report'}
                        </button>
                    </form>
                </div>

                {/* --- 2. Middle Column: Preview (2/3) --- */}
                <div className="report-column report-preview">
                    <div className="report-preview-header">
                        <h4>Report Preview</h4>
                        <button
                            className="btn btn-download"
                            onClick={handleDownload}
                            disabled={!previewData.url}
                        >
                            <i className="fa-solid fa-download"></i>
                            Download
                        </button>
                    </div>
                    {/* --- UPDATED: Conditional render logic --- */}
                    <div className="report-preview-content">
                        {isGenerating ? (
                            <div className="preview-placeholder">
                                <p>Generating your report, please wait...</p>
                            </div>
                        ) : format === 'pdf' && previewData.url ? (
                            // PDF Preview
                            <iframe
                                src={previewData.url}
                                title="Report Preview"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                            ></iframe>
                        ) : format === 'excel' && excelData ? (
                            // Excel Preview
                            <ExcelPreview data={excelData} />
                        ) : (
                            // Default Placeholder
                            <div className="preview-placeholder">
                                <i className="fa-duotone fa-solid fa-file-chart-pie"></i>
                                <p>Your generated report preview will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- 3. Right Column: Recent (1/3) --- */}
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
        </div> /* .page-container */
    );
};

export default ReportsPage;