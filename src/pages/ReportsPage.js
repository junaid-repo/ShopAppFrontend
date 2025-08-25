// src/pages/ReportsPage.js
import React, { useEffect, useMemo, useState } from 'react';

// --- Report options ---
const REPORT_TYPES = [
  'Sales Report',
  'Payment Reports',
  'Customers Report',
];
const userName = "junaid";


// --- Utilities ---
function addMonths(date, n) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + n;
  d.setMonth(targetMonth);
  // Handle month overflow edge cases (e.g., adding to Jan 31)
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}

function CopyPathButton({ path }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy file path"
      style={{ marginLeft: "8px", cursor: "pointer" }}
    >
      📋
      {copied && <span style={{ marginLeft: "4px" }}>Copied!</span>}
    </button>
  );
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

// --- Mock API area ---

// GET /api/reports/recent?limit=10
// Response:
// {
//   "success": true,
//   "reports": [
//     { "id": "rpt_001", "name": "Sales Report", "fromDate": "2025-01-01", "toDate": "2025-03-31", "createdAt": "2025-08-20T10:15:00Z", "fileName": "sales_2025Q1.pdf", "status": "READY" }
//   ]
// }
async function mockFetchRecentReports({ limit = 10 } = {}) {

 try {
    const response = await fetch('http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/report/recent?limit=10', {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    // Expected shape:
    // { success: true, reports: [ { id, name, fromDate, toDate, createdAt, fileName, status }, ... ] }
      return new Promise((resolve) =>
        setTimeout(() => resolve({ success: true, reports: data.slice(0, limit) }), 300)
      );

  } catch (error) {
    console.error("Failed to fetch recent reports:", error);
    return { success: false, reports: [] };
  }

  const seed = [
    {
      id: 'rpt_001',
      name: 'Sales Report',
      fromDate: '2025-01-01',
      toDate: '2025-03-31',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
      fileName: 'sales_2025Q1.pdf',
      status: 'READY',
    },
    {
      id: 'rpt_002',
      name: 'Product Report',
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
      fileName: 'product_jun_2025.csv',
      status: 'READY',
    },
    {
      id: 'rpt_003',
      name: 'Payment Reports',
      fromDate: '2025-07-01',
      toDate: '2025-07-31',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2d ago
      fileName: 'payments_jul_2025.xlsx',
      status: 'READY',
    },
  ];
  return new Promise((resolve) =>
    setTimeout(() => resolve({ success: true, reports: seed.slice(0, limit) }), 300)
  );
}

// POST /api/reports/generate
// Payload:
// {
//   "reportType": "Sales Report" | "Product Report" | "Payment Reports" | "Customers Report",
//   "fromDate": "YYYY-MM-DD",
//   "toDate": "YYYY-MM-DD"
// }
// Response:
// {
//   "success": true,
//   "report": {
//     "id": "rpt_1724248900000",
//     "name": "Sales Report",
//     "fromDate": "2025-01-01",
//     "toDate": "2025-03-31",
//     "createdAt": "2025-08-21T13:41:40.000Z",
//     "fileName": "sales_report_1724248900000.pdf",
//     "status": "READY"
//   }
// }
function mockGenerateReport(payload) {
  const ts = Date.now();
  const key = payload.reportType.toLowerCase().replace(/\s+/g, '_');
  const fileExt = payload.reportType.includes('Product') ? 'csv' : payload.reportType.includes('Payment') ? 'xlsx' : 'pdf';
  const report = {
    id: `rpt_${ts}`,
    name: payload.reportType,
    fromDate: payload.fromDate,
    toDate: payload.toDate,
    createdAt: new Date(ts).toISOString(),
    fileName: `${key}_${ts}.${fileExt}`,
    status: 'READY',
  };
  return new Promise((resolve) =>
    setTimeout(() => resolve({ success: true, report }), 600)
  );
}

// --- Component ---
const ReportsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const [recentReports, setRecentReports] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load recent reports (mocked)
  useEffect(() => {
    let mounted = true;
    setLoadingRecent(true);
    mockFetchRecentReports({ limit: 10 })
      .then((res) => {
        if (mounted && res.success) setRecentReports(res.reports);
      })
      .catch(() => {
        alert('Failed to fetch recent reports (mock).');
      })
      .finally(() => {
        if (mounted) setLoadingRecent(false);
      });
    return () => (mounted = false);
  }, []);

  // Validation
  const validationError = useMemo(() => {
    if (!fromDate || !toDate) return '';
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) return 'To date cannot be before From date.';
    if (!isRangeWithin12Months(fromDate, toDate)) return 'Date range cannot exceed 12 months.';
    return '';
  }, [fromDate, toDate]);

  const canGenerate = fromDate && toDate && reportType && !validationError && !isGenerating;

  const onGenerate = async (e) => {
  e.preventDefault();
  if (!canGenerate) return;

  setIsGenerating(true);

  try {const payload = { reportType, fromDate, toDate };
       console.log("Generate Report - Payload:", payload);

       // POST to backend and expect an Excel binary
       const response = await fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/report", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(payload),
       });

       if (!response.ok) {
         throw new Error("Failed to generate report");
       }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Format datetime: YYYYMMDD_HHmmss
      const now = new Date();
      const dateTimeStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);

      // Ensure no leading dot in extension
      const extension = "xlsx";
const cleanExt = extension.replace(/^\.+/, "");
//const pureFileName = `${reportType}_${dateTimeStr}.${cleanExt}`;

const clean = str => str.replace(/\.+$/, ""); // remove trailing dots
const pureFileName = `${clean(reportType)}_${clean(dateTimeStr)}.${clean(extension)}`;

      const osLinks = {
        windows: `file:///C:/Users/${userName}/Downloads/${pureFileName}`,
        macos: `file:///Users/${userName}/Downloads/${pureFileName}`,
        ubuntu: `file:///home/${userName}/Downloads/${pureFileName}`
      };

      // Create downloadable link element
      const a = document.createElement("a");
      a.href = url;
      a.download = pureFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Store clickable link in fileName property
const fileUrl = osLinks.windows; // or macos / ubuntu

setRecentReports(prev => [
  {
    id: Date.now(),
    name: reportType,
    fromDate,
    toDate,
    createdAt: now,
    fileName: pureFileName,
  },
  ...prev
].slice(0, 10));

      // Call save API with details
      const saveReportPayload = {
        reportType,
        fromDate,
        toDate,
        generatedAt: now.toISOString(),
        fileName: pureFileName
      };

      await fetch("//localhost:6062/api/shop/report/saveDetails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveReportPayload)
      });
      alert("Report generated successfully! You can find it in your Downloads folder.");

      window.URL.revokeObjectURL(url);
 } catch (err) {
    console.error(err);
    alert("Something went wrong while generating the report.");
  } finally {
    setIsGenerating(false);
  }
  };

  const selectType = (type) => {
    setReportType(type);
    setShowTypeMenu(false);
  };

  return (
    <div className="page-container">
      <h2>Reports</h2>

      {/* Top section: filters and actions */}

      <div className="glass-card" style={{ padding: '1rem' }}>
        <form onSubmit={onGenerate}>
          <div
            className="generate-report-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
          >
            {/* Left: Date selectors */}
            <div style={{ display: 'flex', gap: '1rem' }}>
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
            </div>

            {/* Right: Report type dropdown + Generate */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
              <div className="form-group" style={{ position: 'relative', flex: 1 }}>
                <label>Report type</label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowTypeMenu((s) => !s)}
                  aria-haspopup="listbox"
                  aria-expanded={showTypeMenu}
                >
                  {reportType || 'Select report type'}
                </button>
                {showTypeMenu && (
                  <ul
                    role="listbox"
                    className="glass-card"
                    style={{
                      position: 'absolute',
                      zIndex: 10,
                      marginTop: '0.25rem',
                      listStyle: 'none',
                      padding: '0.5rem 0',
                      minWidth: '220px',
                    }}
                  >
                    {REPORT_TYPES.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          className="btn"
                          style={{ width: '100%', textAlign: 'left', borderRadius: 0 }}
                          onClick={() => selectType(t)}
                          role="option"
                          aria-selected={reportType === t}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-actions">
                <button type="submit" className="btn" disabled={!canGenerate}>
                  {isGenerating ? 'Generating…' : 'Generate report'}
                </button>
              </div>
            </div>
          </div>

          {validationError && (
            <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>{validationError}</p>
          )}
        </form>
      </div>


      {/* Bottom section: recent reports */}
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <div className="page-header" style={{ padding: '1rem 1rem 0 1rem' }}>
          <h3 style={{ margin: 0 }}>Recent generated reports</h3>
        </div>

        <div style={{ padding: '1rem' }}>
          {loadingRecent ? (
            <p>Loading recent reports…</p>
          ) : recentReports.length === 0 ? (
            <p>No reports yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Report name</th>
                  <th>Duration</th>
                  <th>Generated</th>
                  <th>File name</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{r.name}</td>
                    <td>{formatRange(r.fromDate, r.toDate)}</td>
                    <td>{timeAgo(r.createdAt)}</td>
                    <td> <a
                                href={`file:///home/${userName}/Downloads/${r.fileName}`} // or your real URL
                                download={r.fileName}
                              >{r.fileName}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mock API: Fetch recent reports example */}
      {/* Example call:
          mockFetchRecentReports({ limit: 10 }).then(res => console.log(res));
          // Response shape:
          // { success: true, reports: [ { id, name, fromDate, toDate, createdAt, fileName, status }, ... ] }
      */}
    </div>
  );
};

export default ReportsPage;
