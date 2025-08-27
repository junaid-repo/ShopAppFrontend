import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";

const SalesPage = () => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    const [selectedOrder, setSelectedOrder] = useState(null); // 🟢 For modal details
    const [showModal, setShowModal] = useState(false);
    const token = localStorage.getItem("jwt_token");
    const config = useConfig();
    var apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }


    useEffect(() => {
        fetch(apiUrl + "/api/shop/get/sales", {
            method: "GET",
            headers: {

                'Authorization': `Bearer ${token}`
            }
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then((data) => {
                setSales(data);
            })
            .catch((error) => {
                console.error("Error fetching sales:", error);
                alert("Something went wrong while fetching sales.");
            });
    }, []);

    const filteredSales = sales.filter(s =>
        s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLast = currentPage * pageSize;
    const indexOfFirst = indexOfLast - pageSize;
    const currentSales = filteredSales.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredSales.length / pageSize);

    const handleDownloadInvoice = async (saleId) => {try {
        const response = await axios.get(
            `${apiUrl}/api/shop/get/invoice/${saleId}`,
            {
                responseType: "blob",
                headers: {
                    Authorization: `Bearer ${token}` // <-- Add your token here
                }
            }
        );

        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `invoice-${saleId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error downloading invoice:", error);
        alert("Failed to download the invoice. Please try again.");
    }
    };

    // 🟢 API CALL needed here when user clicks a row
    const handleRowClick = async (saleId) => {

        try {
            const response = await axios.get(
                `${apiUrl}/api/shop/get/order/${saleId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}` // Replace with your token variable
                    }
                }
            );

            setSelectedOrder(response.data); // full order details
            setShowModal(true);

        } catch (error) {
            console.error("Error fetching order details:", error);
            alert("Failed to fetch order details.");
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
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
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
                        <th>Comments</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map(sale => (
                        <tr
                            key={sale.id}
                            onClick={() => handleRowClick(sale.id)} // 🟢 click row to open modal
                            style={{ cursor: "pointer" }}
                        >
                            <td>{sale.id}</td>
                            <td>{sale.customer}</td>
                            <td>{sale.date}</td>
                            <td>₹{sale.total.toLocaleString()}</td>
                            <td>
                  <span className={sale.status === 'Paid' ? 'status-paid' : 'status-pending'}>
                    {sale.status}
                  </span>
                            </td>
                            <td>{sale.remarks}</td>
                            <td>
                                <button
                                    className="download-btn"
                                    title="Download Invoice"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadInvoice(sale.id);
                                    }}
                                >
                                    <FaDownload size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {currentSales.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center' }}>No sales found.</td>
                        </tr>
                    )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                            Prev
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                            <button
                                key={idx}
                                className={currentPage === idx + 1 ? 'active' : ''}
                                onClick={() => setCurrentPage(idx + 1)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* 🟢 Order Details Modal */}
            {showModal && selectedOrder && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)", // matches .modal-overlay
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                        animation: "fadeIn 0.3s ease"
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            background: "var(--glass-bg)",
                            borderRadius: "20px",
                            padding: "2rem",
                            width: "90%",
                            maxWidth: "700px",
                            boxShadow: "0 8px 30px var(--shadow-color)",
                            maxHeight: "80vh",
                            overflowY: "auto",
                            color: "var(--text-color)",
                            border: "1px solid var(--border-color)",
                            animation: "slideIn 0.3s ease"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "2px solid var(--border-color)",
                            marginBottom: "1.5rem",
                            paddingBottom: "0.5rem",
                            color: "var(--primary-color)"
                        }}>
                            <h2 style={{ margin: 0, fontSize: "1.8rem" }}>
                                Invoice #{selectedOrder.invoiceId}
                            </h2>
                            <button
                                style={{
                                    background: "none",
                                    border: "none",
                                    fontSize: "1.5rem",
                                    cursor: "pointer",
                                    color: "var(--text-color)"
                                }}
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        {/* Customer Details */}
                        <div style={{ marginBottom: "1.5rem", fontSize: "1.2rem", lineHeight: "1.8rem" }}>
                            <p><strong>👤 Customer:</strong> {selectedOrder.customerName}</p>
                            <p><strong>📧 Email:</strong> {selectedOrder.customerEmail}</p>
                            <p><strong>📞 Phone:</strong> {selectedOrder.customerPhone}</p>
                            <p><strong>💳 Status:</strong> {selectedOrder.paid ? "✅ Paid" : "❌ Pending"}</p>
                        </div>

                        {/* Items */}
                        <h3 style={{ marginBottom: "1rem", fontSize: "1.4rem", color: "var(--text-color)" }}>🛍️ Items</h3>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, flexGrow: 1 }}>
                            {selectedOrder.items.map((item, idx) => (
                                <li
                                    key={idx}
                                    style={{
                                        background: "white",
                                        padding: "1rem 1.2rem",
                                        borderRadius: "12px",
                                        marginBottom: "0.75rem",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: "1.1rem",
                                        fontWeight: 500,
                                        border: "1px solid var(--border-color)",
                                        boxShadow: "0 2px 6px var(--shadow-color)"
                                    }}
                                >
                                    <span>{item.productName} (x{item.quantity})</span>
                                    <span>₹{item.unitPrice.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Footer - Totals */}
                        <div style={{
                            borderTop: "2px solid var(--border-color)",
                            marginTop: "1.5rem",
                            paddingTop: "1rem",
                            textAlign: "right"
                        }}>
                            {selectedOrder.subTotal !== undefined && (
                                <p style={{ fontSize: "1.2rem", margin: "0.3rem 0" }}>
                                    Subtotal: ₹{selectedOrder.subTotal.toLocaleString()}
                                </p>
                            )}
                            {selectedOrder.tax !== undefined && (
                                <p style={{ fontSize: "1.2rem", margin: "0.3rem 0" }}>
                                    Tax: ₹{selectedOrder.tax.toLocaleString()}
                                </p>
                            )}
                            {selectedOrder.discount !== undefined && (
                                <p style={{ fontSize: "1.2rem", margin: "0.3rem 0" }}>
                                    Discount: -₹{selectedOrder.discount.toLocaleString()}
                                </p>
                            )}
                            <h5 style={{
                                marginTop: "1rem",
                                fontSize: "1.8rem",
                                fontWeight: "bold",
                                color: "var(--primary-color)"
                            }}>
                                GST: ₹{selectedOrder.gstRate.toLocaleString()}
                            </h5>
                            <h2 style={{
                                marginTop: "1rem",
                                fontSize: "1.8rem",
                                fontWeight: "bold",
                                color: "var(--primary-color)"
                            }}>
                                Total: ₹{selectedOrder.totalAmount.toLocaleString()}
                            </h2>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
};

export default SalesPage;
