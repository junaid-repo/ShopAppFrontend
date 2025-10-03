// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { FaRupeeSign, FaBoxes, FaBan, FaChartLine } from 'react-icons/fa';
import CurrencyRupeeTwoToneIcon from '@mui/icons-material/CurrencyRupeeTwoTone';
import Modal from '../components/Modal';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';
import { useConfig } from "./ConfigProvider";
import { formatDate } from "../utils/formatDate";
import { Line, Bar } from 'react-chartjs-2';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// Mock Data for the new weekly sales graph
const mockWeeklySales = [
    { day: 'Mon', totalSales: 12500, unitsSold: 45 },
    { day: 'Tue', totalSales: 18000, unitsSold: 60 },
    { day: 'Wed', totalSales: 15500, unitsSold: 52 },
    { day: 'Thu', totalSales: 21000, unitsSold: 75 },
    { day: 'Fri', totalSales: 25000, unitsSold: 88 },
    { day: 'Sat', totalSales: 32000, unitsSold: 110 },
    { day: 'Sun', totalSales: 28500, unitsSold: 95 },
];
const mockGoalData = {
    actualSales: 861800,
    estimatedSales: 1200000,
    actualProfit: 155124,
    estimatedProfit: 250000,
};
// Accept an optional setSelectedPage prop so shortcuts can switch pages internally
const DashboardPage = ({ setSelectedPage }) => {
    const [dashboardData, setDashboardData] = useState({});
    const [sales, setSales] = useState([]);
    const [timeRange, setTimeRange] = useState('lastWeek');
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [isAddProdModalOpen, setIsAddProdModalOpen] = useState(false);

        const [weeklySalesData, setWeeklySalesData] = useState([]); // State for graph data
    const [goalData, setGoalData] = useState(mockGoalData);
    const [graphView, setGraphView] = useState('all');
    const [isAdjusting, setIsAdjusting] = useState(false);


    const config = useConfig();
    const navigate = useNavigate();

    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    /**
     * 📌 Fetches weekly sales data for the line graph.
     * This function would make an API call to your backend analytics endpoint.
     */
    const fetchWeeklySales = async () => {
        // API Endpoint: GET /api/shop/get/analytics/weekly-sales
        // Payload Sent: None
        // Expected Response (JSON):
        // [
        //   { "day": "Mon", "totalSales": 12000, "unitsSold": 15 },
        //   { "day": "Tue", "totalSales": 18500, "unitsSold": 22 },
        //   ...
        // ]
        try {
            // ---- MOCK DATA USAGE ----
          //  setWeeklySalesData(mockWeeklySales);
            // ---- ACTUAL API CALL (when ready)----
            const response = await fetch(`${apiUrl}/api/shop/get/analytics/weekly-sales/${timeRange}`, {
                method: "GET",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
             });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("Weekly Sales Data:", data);
            setWeeklySalesData(data);
        } catch (error) {
            alert("Error fetching weekly sales data:")
            console.error("Error fetching weekly sales data:", error);
            setWeeklySalesData(mockWeeklySales); // Fallback to mock data on error
        }
    };

    // Fetch Graph Data on component mount
    useEffect(() => {
        fetchWeeklySales();
    }, [timeRange, apiUrl]);

    // Chart.js Configuration
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: document.body.classList.contains('dark-theme') ? '#c9d1d9' : '#333' }
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Revenue (₹)', color: '#8884d8' },
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Units Sold', color: '#82ca9d' },
                ticks: { color: '#9ca3af' },
                grid: { drawOnChartArea: false },
            },
            x: {
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            }
        },
    };

    const chartData = {
        labels: weeklySalesData.map(d => d.day),
        datasets: [
            {
                label: 'Total Sales',
                data: weeklySalesData.map(d => d.totalSales),
                borderColor: '#00a6ff',
                backgroundColor: 'rgba(136, 132, 216, 0.2)',
                yAxisID: 'y',
                tension: 0.4 // Increased for smoother lines
            },
            {
                label: 'Units Sold',
                data: weeklySalesData.map(d => d.unitsSold),
                borderColor: '#ff0000',
                backgroundColor: 'rgba(130, 202, 157, 0.2)',
                yAxisID: 'y1',
                tension: 0.4 // Increased for smoother lines
            },
        ],

    };

    // --- Chart Configurations ---
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
            y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Revenue (₹)' } },
            y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Units Sold' }, grid: { drawOnChartArea: false } },
        },
    };

    const lineChartData = {
        labels: weeklySalesData.map(d => d.day),
        datasets: [
            { label: 'Total Sales', data: weeklySalesData.map(d => d.totalSales), borderColor: '#00a6ff', yAxisID: 'y', tension: 0.4 },
            { label: 'Units Sold', data: weeklySalesData.map(d => d.unitsSold), borderColor: '#ff0000', yAxisID: 'y1', tension: 0.4 },
        ],
    };

    const percentageLabelPlugin = {
        id: 'percentageLabel',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea: { right }, scales: { y } } = chart;
            ctx.save();
            const datasetMeta = chart.getDatasetMeta(1); // 'Actual' dataset
            datasetMeta.data.forEach((datapoint, index) => {
                const { actual, estimated } = options.sourceData[index];
                const percentage = estimated > 0 ? ((actual / estimated) * 100).toFixed(0) : 0;
                const xPosition = datapoint.x + 5;
                if (xPosition + 40 > right) return; // Don't draw if too close to edge
                ctx.font = 'bold 12px sans-serif';
                ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#c9d1d9' : '#333';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${percentage}%`, xPosition, datapoint.y);
            });
        }
    };

    // ✅ CHANGED: Bar chart configuration updated for overlap effect
    const createBarChartConfig = (label, actual, estimated) => {
        const color = label.includes('Sales') ? 'rgba(0,170,255,0.49)' : '#2ecc71';
        const fadedColor = label.includes('Sales') ? 'rgb(0,170,255)' : 'rgba(46, 204, 113, 0.2)';
        return {
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ₹${context.parsed.x.toLocaleString('en-IN')}`
                        }
                    },
                    percentageLabel: { sourceData: [{ actual, estimated }] }
                },
                scales: {
                    x: { display: false, grid: { display: false }, max: estimated * 1.15 },
                    y: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
                },
            },
            data: {
                labels: [label],
                datasets: [
                    {
                        label: `Estimated`,
                        data: [estimated],
                        backgroundColor: fadedColor,
                        barThickness: 25,
                        borderRadius: 28,
                        order: 1, // draw first
                    },
                    {
                        label: `Actual`,
                        data: [actual],
                        backgroundColor: color,
                        barThickness: 25, // thinner so estimated still visible
                        borderRadius: 38,
                        order: 2, // draw second
                    },
                ],

            },
            plugins: [percentageLabelPlugin]
        };
    };

    const salesChart = createBarChartConfig('Sales', goalData.actualSales, goalData.estimatedSales);
    const profitChart = createBarChartConfig('Profit', goalData.actualProfit, goalData.estimatedProfit);




    // 📌 Get JWT from localStorage

    // 📌 Fetch Dashboard Details
    useEffect(() => {
        fetch(`${apiUrl}/api/shop/get/dashboardDetails/${timeRange}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
                // 🔑 Attach JWT
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setDashboardData(data))
            .catch((err) => {
                console.error("Error fetching dashboardData:", err);
                alert("Something went wrong while fetching dashboard details.");
            });
    }, [timeRange, apiUrl]);

    // 📌 Fetch Sales
    useEffect(() => {
        //alert(token);
        fetch(`${apiUrl}/api/shop/get/top/sales/${timeRange}`, {
            method: "GET",
            credentials: 'include',
            params: {
                count: 3 // ✅ sent to backend
            },
            headers: {
                "Content-Type": "application/json"
                // 🔑 Attach JWT
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setSales(data))
            .catch((err) => {
                console.error("Error fetching sales:", err);
                alert("Something went wrong while fetching sales data.");
            });
    }, [timeRange, apiUrl]);

    const recentSales = sales.slice(0, 3);

    useEffect(() => {
        const fetchGoalData = async () => {
            // API Endpoint: GET /api/shop/get/dashboard/goals
            try {
                const response = await fetch(`${apiUrl}/api/shop/get/dashboard/goals/${timeRange}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: {"Content-Type": "application/json"},
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setGoalData(data);
            } catch (error) {
                console.error("Error fetching goal data:", error);

            }
            //setGoalData(mockGoalData);
        };
        if (apiUrl) fetchGoalData();
    }, [timeRange, apiUrl]);


    // 📌 Add Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, email, phone };
            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                    // 🔑 Attach JWT
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert("Customer added successfully!");
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Something went wrong while adding the customer.");
        }
        setIsNewCusModalOpen(false);
        setName("");
        setEmail("");
        setPhone("");
    };

    // 📌 Add Product
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"// 🔑 Attach JWT
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("API response:", data);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            alert("New product added!");
            setIsAddProdModalOpen(false);
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Something went wrong while adding the product.");
        }
    };

    return (
        <div className="dashboard">
            <h2>Dashboard</h2>

            {/* Time Range Selector */}
            <div className="time-range-selector glass-card">
                <label htmlFor="timeRange">📅 </label>
                <select
                    id="timeRange"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="dropdown"
                >
                    <option value="today">Today</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="lastYear">Last Year</option>
                </select>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <FaChartLine className="icon revenue" />
                    <div>
                        <p>Total Revenue</p>
                        <h3>₹{dashboardData.monthlyRevenue?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <FaBoxes className="icon units" />
                    <div>
                        <p>Total Units Sold</p>
                        <h3>{dashboardData.totalUnitsSold}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <FaRupeeSign className="icon tax" />
                    <div>
                        <p>Tax Collected</p>
                        <h3>₹{dashboardData.taxCollected?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <FaBan className="icon stock" />
                    <div>
                        <p>Out of Stock Products</p>
                        <h3>{dashboardData.outOfStockCount}</h3>
                    </div>
                </div>
            </div>

            {/* Shortcuts */}
            <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                <div className="goal-tracking glass-card">
                    <div
                        className="card-header"
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h3 style={{ margin: 0 }}>Goals</h3>
                            {goalData.fromDate && goalData.toDate && (
                                <span style={{ fontSize: "0.8rem", color: "#888" }}>
                            ({goalData.fromDate} - {goalData.toDate})
                          </span>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <button
                                className="btn small-btn"
                                onClick={async () => {
                                    if (isAdjusting) {
                                        // Save changes on Done
                                        await fetch(`${apiUrl}/api/shop/update/goals`, {
                                            method: "POST",
                                            credentials: "include",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(goalData),
                                        });
                                    }
                                    setIsAdjusting(!isAdjusting);
                                }}
                            >
                                {isAdjusting ? "Done" : "Adjust"}
                            </button>
                        </div>
                    </div>

                    <div style={{ height: "80px", margin: 0, padding: 0 }}>
                        <Bar
                            options={salesChart.options}
                            data={salesChart.data}
                            plugins={salesChart.plugins}
                        />
                    </div>

                </div>

                <div className="quick-shortcuts glass-card">
                    <h3>Quick Shortcuts</h3>
                    <div className="shortcuts-container">
                        <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('billing'); else navigate('/billing'); }}>New Sale</button>
                        <button className="btn" onClick={() => setIsAddProdModalOpen(true)}>Add Product</button>
                        <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>New Customer</button>
                        <button className="btn" onClick={() => { if (setSelectedPage) setSelectedPage('reports'); else navigate('/reports'); }}>Report</button>
                    </div>
                </div>


            </div>

            {/* Recent Sales */}
            {/* Sales and Analytics Section */}
            <div className="sales-analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Weekly Sales Graph */}
                <div className="weekly-sales-graph glass-card">
                    <h3>Sales Performance</h3>
                    <div className="chart-container" style={{height: "250px"}}>
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
                {/* Recent Sales Table */}
                <div className="recent-sales glass-card">
                    <h3>Top Sales</h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Total</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sales.map((sale) => (
                                <tr key={sale.id}>
                                    <td>{sale.id}</td>
                                    <td>{sale.customer}</td>
                                    <td>{formatDate(sale.date)}</td>
                                    <td>₹{sale.total.toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
            {/* Add Customer Modal */}
            {isNewCusModalOpen && (
                <Modal title ="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>

                    <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn">Add Customer</button>
                        </div>
                    </form>
                </Modal>
            )}

            <Modal
                title="Adjust Estimates"
                show={isAdjusting}
                onClose={() => setIsAdjusting(false)}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {graphView !== "profit" && (
                        <div className="form-group">
                            <label>Adjust Sales Estimate</label>
                            <input
                                type="number"
                                value={goalData.estimatedSales}
                                onChange={(e) =>
                                    setGoalData({ ...goalData, estimatedSales: +e.target.value })
                                }
                            />
                        </div>
                    )}

                    {/* Date range selection */}
                    <div className="form-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={goalData.fromDate || ""}
                            onChange={(e) =>
                                setGoalData({ ...goalData, fromDate: e.target.value })
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={goalData.toDate || ""}
                            onChange={(e) =>
                                setGoalData({ ...goalData, toDate: e.target.value })
                            }
                        />
                    </div>

                    <div
                        className="form-actions"
                        style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}
                    >
                        <button
                            className="btn"
                            onClick={async () => {
                                await fetch(`${apiUrl}/api/shop/update/goals`, {
                                    method: "POST",
                                    credentials: "include",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(goalData),
                                });
                                setIsAdjusting(false);
                            }}
                        >
                            Save
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsAdjusting(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>




            {/* Add Product Modal */}
            <Modal title="Add New Product" show={isAddProdModalOpen} onClose={() => setIsAddProdModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">-- Select Category --</option>
                            <option value="Smartphones">Smartphones</option>
                            <option value="Laptops and Computers">Laptops and Computers</option>
                            <option value="Audio">Audio</option>
                            <option value="Videos">Videos</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Price</label>
                        <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Cost Price</label>
                        <input type="number" required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Stock Quantity</label>
                        <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <input type="number" required value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add Product</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default DashboardPage;
