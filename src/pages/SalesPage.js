// src/pages/SalesPage.js
import React, { useState, useEffect } from 'react';
import { mockSales } from '../mockData';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';

const SalesPage = () => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredSales = sales.filter(s =>
        s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDownloadInvoice2 = (saleId) => {
        // In a real app, this would trigger a PDF generation API or logic
        alert(`Downloading invoice ${saleId}... (Demo)`);
    };

    const handleDownloadInvoice = async (saleId) => {
      try {
        const response = await axios.get(
          `http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/invoice/${saleId}`, // adjust URL to match your controller mapping
          {
            responseType: "blob", // important for binary files
          }
        );

        // Create a blob from the PDF stream
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);

        // Create a temporary link to trigger download
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `invoice-${saleId}.pdf`);
        document.body.appendChild(link);
        link.click();

        // Clean up
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading invoice:", error);
        alert("Failed to download the invoice. Please try again.");
      }
    };

    return (
        <div className="page-container">
            <h2>Sales</h2>
             <div className="page-header">
                <input
                    type="text"
                    placeholder="Search by Invoice ID or Customer..."
                    className="search-bar"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="glass-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map(sale => (
                            <tr key={sale.id}>
                                <td>{sale.id}</td>
                                <td>{sale.customer}</td>
                                <td>{sale.date}</td>
                                <td>₹{sale.total.toLocaleString()}</td>
                                <td><span className={sale.status === 'Paid' ? 'status-paid' : 'status-pending'}>{sale.status}</span></td>
                                <td>
                                    <button className="btn-icon" onClick={() => handleDownloadInvoice(sale.id)}>
                                        <FaDownload />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesPage;