// src/pages/PaymentsPage.js
import React, { useState, useEffect } from 'react';
import { mockPayments } from '../mockData';

const PaymentsPage = () => {
    const [payments, setPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
  fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/paymentLists", {
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
      setPayments(data);
    })
    .catch((error) => {
      console.error("Error fetching paymentLists:", error);
      alert("Something went wrong while fetching paymentLists.");
    }); }, []);

    const filteredPayments = payments.filter(p =>
        p.saleId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            <h2>Payments</h2>
            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search by Invoice ID..."
                    className="search-bar"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="glass-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Payment ID</th>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayments.map(payment => (
                            <tr key={payment.id}>
                                <td>{payment.id}</td>
                                <td>{payment.saleId}</td>
                                <td>{payment.date}</td>
                                <td>₹{payment.amount.toLocaleString()}</td>
                                <td>{payment.method}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentsPage;