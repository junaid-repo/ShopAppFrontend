// src/pages/PaymentsPage.js
import React, { useState, useEffect } from "react";
import { useConfig } from "./ConfigProvider";

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // show 5 records per page

const config = useConfig();
var apiUrl="";
  if(config){
  console.log(config.API_URL);
  apiUrl=config.API_URL;
  }
    const token = localStorage.getItem("jwt_token");
  useEffect(() => {
    fetch(apiUrl+"/api/shop/get/paymentLists", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
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
      });
  }, []);

  // filter by search
  const filteredPayments = payments.filter((p) =>
    p.saleId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // pagination calculations
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  return (
    <div className="page-container">
      <h2>Payments</h2>
      <div className="page-header">
        <input
          type="text"
          placeholder="Search by Invoice ID..."
          className="search-bar"
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // reset to page 1 after search
          }}
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
            {currentPayments.length > 0 ? (
              currentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>{payment.saleId}</td>
                  <td>{payment.date}</td>
                  <td>₹{payment.amount.toLocaleString()}</td>
                  <td>{payment.method}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination button">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPage(index + 1)}
            className={currentPage === index + 1 ? "active" : ""}
          >
            {index + 1}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PaymentsPage;
