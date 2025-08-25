// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { mockDashboardData, mockSales } from '../mockData';
import { FaRupeeSign, FaBoxes, FaBan, FaChartLine } from 'react-icons/fa';
import './DashboardPage.css';

const DashboardPage = () => {
    const [dashboardData, setDashboardData] = useState({});
    const [sales, setSales] = useState([]);

    useEffect(() => {

      fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/dashboardDetails", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log("API response:", data);
           // setCustomers(data);
             setDashboardData(data);
          })
          .catch((error) => {
            console.error("Error fetching dashboardData:", error);
            alert("Something went wrong while fetching customers.");
          });


       // setDashboardData(mockDashboardData);
    }, []);

      useEffect(() => {
          fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/sales", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then((data) => {
                console.log("API response:", data);
               // setCustomers(data);
                 setSales(data);
              })
              .catch((error) => {
                console.error("Error fetching sales:", error);
                alert("Something went wrong while fetching customers.");
              });

        }, []);

    const recentSales = sales.slice(0, 3); // Get first 3 sales for demo

    return (
        <div className="dashboard">
            <h2>Dashboard</h2>
            <div className="stats-grid">
                <div className="stat-card glass-card">
                    <FaRupeeSign className="icon revenue" />
                    <div>
                        <p>Total Revenue (Month)</p>
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
            <div className="quick-shortcuts glass-card">
                <h3>Quick Shortcuts</h3>
                <div className="shortcuts-container">
                    <button className="btn">New Sale</button>
                    <button className="btn">Add Product</button>
                    <button className="btn">New Customer</button>
                    <button className="btn">Generate Report</button>
                </div>
            </div>
             <div className="recent-sales glass-card">
                <h3>Recent Sales</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentSales.map(sale => (
                            <tr key={sale.id}>
                                <td>{sale.id}</td>
                                <td>{sale.customer}</td>
                                <td>{sale.date}</td>
                                <td>₹{sale.total.toLocaleString()}</td>
                                <td><span className={sale.status === 'Paid' ? 'status-paid' : 'status-pending'}>{sale.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardPage;