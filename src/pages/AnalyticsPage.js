import React, { useState, useEffect } from 'react';
import './CustomersPage.css';
import { useConfig } from "./ConfigProvider";
import { Line, Bar } from 'react-chartjs-2';
import { useAlert } from '../context/AlertContext';
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
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AnalyticsPage = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMetric, setSelectedMetric] = useState('everything');
    const [chartType, setChartType] = useState('line');
    const [data, setData] = useState({});
    const config = useConfig();
    let apiUrl = config ? config.API_URL : "";
    const { showAlert } = useAlert();
    const baseColors = {
        sales: '75, 192, 192',
        stocks: '255, 99, 132',
        taxes: '255, 206, 86',
        customers: '54, 162, 235',
        profits: '153, 102, 255',
        onlinePayments: '255, 159, 64'
    };

    useEffect(() => {
        const today = new Date();
        const end = today;
        const start = new Date(today);
        start.setMonth(start.getMonth() - 5);

        const formatDate = (date) => date.toISOString().split('T')[0];
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            if (!validateDateRange(startDate, endDate)) return;
            fetchAnalyticsData();
        }
    }, [startDate, endDate]);

    const validateDateRange = (start, end) => {
        const startDt = new Date(start);
        const endDt = new Date(end);
        const diffMonths = (endDt.getFullYear() - startDt.getFullYear()) * 12 + (endDt.getMonth() - startDt.getMonth());
        if (diffMonths > 12) {
            showAlert("Date range cannot exceed 12 months.");
            return false;
        }
        return true;
    };

    const fetchAnalyticsData = async () => {
        const payload = { startDate, endDate, metric: selectedMetric };

        try {
            const response = await fetch(`${apiUrl}/api/shop/get/analytics`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            setData(result);
        } catch (error) { // ✅ FIXED: Added curly braces here
            console.error("Error fetching analytics data:", error);
        }
    };

    const chartData = (label, values) => {
        const baseColor = baseColors[label] || '0, 0, 0';
        const solidColor = `rgb(${baseColor})`;

        return {
            labels: data.labels || [],
            datasets: [
                {
                    label: label,
                    data: values,
                    borderColor: solidColor,
                    backgroundColor: (context) => {
                        if (chartType === 'bar') {
                            return `rgba(${baseColor}, 0.7)`;
                        }
                        const ctx = context.chart.ctx;
                        if (!ctx) return `rgba(${baseColor}, 0.1)`;
                        const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                        gradient.addColorStop(0, `rgba(${baseColor}, 0.4)`);
                        gradient.addColorStop(0.6, `rgba(${baseColor}, 0.05)`);
                        gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
                        return gradient;
                    },
                    tension: 0.3,
                    fill: true,
                }
            ]
        };
    };

    const metrics = ['sales', 'revenues', 'profits' , 'stocks', 'taxes', 'customers'];

    const renderChartComponent = (chartProps) =>
        chartType === 'line' ? <Line {...chartProps} /> : <Bar {...chartProps} />;

    const renderCharts = () => {
        if (selectedMetric === 'everything') {
            return (
                <div
                    className="customer-grid"
                    style={{
                        marginTop: '20px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(300px, 1fr))',
                        gap: '20px',
                        justifyItems: 'stretch'
                    }}
                >
                    {metrics.map(metric => (
                        <div className="glass-card" key={metric} style={{ width: '100%' }}>
                            <h3 style={{ textTransform: 'capitalize', textAlign: 'center' }}>
                                {metric === 'onlinePaymentss' ? 'Online Payment Count' : metric}
                            </h3>
                            {renderChartComponent({ data: chartData(metric, data[metric] || []) })}
                        </div>
                    ))}
                </div>
            );
        } else {
            return (
                <div className="glass-card" style={{ maxWidth: '800px', margin: '40px auto' }}>
                    <h3 style={{ textTransform: 'capitalize', textAlign: 'center' }}>
                        {selectedMetric === 'onlinePaymentss' ? 'Online Payment Count' : selectedMetric}
                    </h3>
                    {renderChartComponent({ data: chartData(selectedMetric, data[selectedMetric] || []) })}
                </div>
            );
        }
    };

    return (
        <div className="page-container">
            <h2>Analytics Dashboard</h2>

            <div
                className="filter-bar glass-card"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    padding: '40px',
                    marginBottom: '10px'
                }}
            >
                <label>
                    Start Date:
                    <input type="date" className="date-input" value={startDate}
                           onChange={(e) => setStartDate(e.target.value)} />
                </label>
                <label>
                    End Date:
                    <input type="date" className="date-input" value={endDate}
                           onChange={(e) => setEndDate(e.target.value)} />
                </label>
                <select
                    className="date-input"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    style={{marginLeft:'400px', marginTop:"12px", width: '15%'}}
                >
                    <option value="everything">Everything</option>
                    {metrics.map(m => (
                        <option key={m} value={m}>
                            {m === 'onlinePaymentss' ? 'Online Payment Count' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </option>
                    ))}
                </select>

                <select
                    className="date-input"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    style={{marginLeft:'20px', marginTop:"12px", width: '15%'}}
                >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                </select>

                <button
                    className="btn"
                    onClick={() => {
                        if (validateDateRange(startDate, endDate)) {
                            fetchAnalyticsData();
                        }
                    }}
                >
                    Refresh
                </button>
            </div>

            {renderCharts()}
        </div>
    );
};

export default AnalyticsPage;