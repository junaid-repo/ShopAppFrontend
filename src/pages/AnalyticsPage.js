import React, { useState, useEffect } from 'react';
import './CustomersPage.css';
import { useConfig } from "./ConfigProvider";
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

const AnalyticsPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('everything');
  const [chartType, setChartType] = useState('line'); // 🔹 NEW
  const [data, setData] = useState({});
  const config = useConfig();
  let apiUrl = config ? config.API_URL : "";
    const token = localStorage.getItem("jwt_token");

  const colors = {
    sales: 'rgb(75, 192, 192)',
    stocks: 'rgb(255, 99, 132)',
    taxes: 'rgb(255, 206, 86)',
    customers: 'rgb(54, 162, 235)',
    profits: 'rgb(153, 102, 255)',
    onlinePayments: 'rgb(255, 159, 64)'
  };

  // 🔹 Set default 6 months
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
      alert("Date range cannot exceed 12 months.");
      return false;
    }
    return true;
  };

  const fetchAnalyticsData = async () => {
    const payload = { startDate, endDate, metric: selectedMetric };

    try {
      const response = await fetch(`${apiUrl}/api/shop/get/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',"Authorization": `Bearer ${token}`, },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    }
  };

  const chartData = (label, values) => ({
    labels: data.labels || [],
    datasets: [
      {
        label: label,
        data: values,
        borderColor: colors[label] || 'rgb(0,0,0)',
        backgroundColor: colors[label] || 'rgb(0,0,0)',
        tension: 0.3,
        fill: chartType === 'line',
      }
    ]
  });

  const metrics = ['sales', 'stocks', 'taxes', 'customers', 'profits', 'onlinePayments'];

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
                {metric === 'onlinePayments' ? 'Online Payment Count' : metric}
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
            {selectedMetric === 'onlinePayments' ? 'Online Payment Count' : selectedMetric}
          </h3>
          {renderChartComponent({ data: chartData(selectedMetric, data[selectedMetric] || []) })}
        </div>
      );
    }
  };

  return (
    <div className="page-container">
      <h2>Analytics Dashboard</h2>

      {/* Filter bar */}
      <div
        className="filter-bar glass-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          padding: '10px',
          marginBottom: '20px'
        }}
      >
        <label>
          Start Date:
          <input type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End Date:
          <input type="date" value={endDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <select
          className="time-range-selector glass-card"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          <option value="everything">Everything</option>
          {metrics.map(m => (
            <option key={m} value={m}>
              {m === 'onlinePayments' ? 'Online Payment Count' : m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>

        {/* 🔹 Chart type selector */}
        <select
          className="time-range-selector glass-card"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
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
