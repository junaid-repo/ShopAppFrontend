import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import {MdDownload} from "react-icons/md";
import './SalesPage.css';
import { formatDate } from "../utils/formatDate";
import { useAlert } from '../context/AlertContext';
import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdShoppingCart,
    MdClose,
    MdCheckCircle,
    MdCancel,
} from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import {useSearchKey} from "../context/SearchKeyContext";

const SalesPage = () => {
    const { showAlert } = useAlert();
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState(null); // 🟢 For modal details
    const [showModal, setShowModal] = useState(false);
    // Sorting state: default createdAt desc (no arrow shown until user clicks a column)
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [hasSortActive, setHasSortActive] = useState(false);
    const [hoveredRow, setHoveredRow] = useState(null);

    const config = useConfig();
    var apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }
    const boxStyle = {
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
    };

    const boxHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '1.3rem',
        fontWeight: '600',
        color: 'var(--text-color)',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
    };

    const detailItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '1.1rem',
        lineHeight: '1.8rem',
        color: 'var(--text-color-secondary)',
    };

    const summaryRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '1.1rem',
        padding: '0.4rem 0',
    };
    const location = useLocation();
    const { searchKey, setSearchKey } = useSearchKey();
    // On mount, check for searchKey in query string
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) {
            setSearchTerm(key);
        }
    }, [location.search]);

    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);

    // Sync search bar with global search key
    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            setSearchTerm(searchKey);
        }
    }, [searchKey]);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/shop/get/sales`, {
                    params: {
                        page: currentPage - 1,
                        size: pageSize,
                        search: searchTerm || '', // ✅ sent to backend
                        sort: sortConfig.key,
                        dir: sortConfig.direction,
                    },
                    withCredentials: true,
                });

                setSales(response.data.content);
                setTotalPages(response.data.totalPages); // ✅ Fix typo here too (was `totalePages`)
            } catch (error) {
                console.error("Error fetching sales:", error);
                showAlert("Something went wrong while fetching sales.");
            }
        };

        fetchSales();
    }, [apiUrl, currentPage, pageSize, searchTerm, sortConfig]); // refetch when sort changes

    // Toggle sorting when user clicks a column header
    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
        setHasSortActive(true);
        setCurrentPage(1);
    };





    const indexOfLast = currentPage * pageSize;
    const indexOfFirst = indexOfLast - pageSize;
  // const currentSales = filteredSales.slice(indexOfFirst, indexOfLast);
    const currentSales = sales;


    const handleDownloadInvoice = async (saleId) => {try {
        const response = await axios.get(
            `${apiUrl}/api/shop/get/invoice/${saleId}`,
            {
                responseType: "blob",
                withCredentials: true,

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
        showAlert("Failed to download the invoice. Please try again.");
    }
    };

    // 🟢 API CALL needed here when user clicks a row
    const handleRowClick = async (saleId) => {

        try {
            const response = await axios.get(
                `${apiUrl}/api/shop/get/order/${saleId}`,
                {
                    withCredentials: true,

                }
            );

            setSelectedOrder(response.data); // full order details
            setShowModal(true);

        } catch (error) {
            console.error("Error fetching order details:", error);
            showAlert("Failed to fetch order details.");
        }

    };

    return (
        <div className="page-container">
            <h2>Sales</h2>
            <div className="page-header" style={{marginTop: "20px"}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.2rem 1rem' }}>

                <input
                    type="text"
                    placeholder="Search by Invoice ID or Customer..."
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                />
                </div>
            </div>

            <div className="glass-card" >
                <table className="data-table">
                    <thead>
                    <tr>
                        {/* No change needed here, 'id' is likely correct */}
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('id')}>
                            Invoice ID {hasSortActive && sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>

                        {/* This key 'customer' should be verified against your backend model */}
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('customer')}>
                            Customer {hasSortActive && sortConfig.key === 'customer' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>

                        {/* CORRECTED: Changed 'createdAt' to 'date' */}
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>
                            Date {hasSortActive && sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>

                        {/* CORRECTED: Changed 'total' to 'totalAmount' */}
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('totalAmount')}>
                            Total {hasSortActive && sortConfig.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>

                        {/* This key 'status' should be verified against your backend model */}
                        <th>Status</th>

                        <th>Comments</th>
                        <th>Invoice</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map((sale) => (
                        <tr
                            key={sale.id}
                            onClick={() => handleRowClick(sale.id)}
                            onMouseEnter={() => setHoveredRow(sale.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                                cursor: "pointer",
                                background: hoveredRow === sale.id ? "rgba(0, 170, 255, 0.08)" : "transparent",
                                transition: "all 0.25s ease",
                            }}
                        >
                            <td>{sale.id}</td>
                            <td>{sale.customer}</td>
                            <td>{formatDate(sale.date)}</td>
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
                                    style={{
                                        cursor: "pointer",
                                        borderRadius: "6px",
                                        padding: "6px",
                                        marginRight: "8px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <MdDownload size={18} color="#d32f2f" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>

                </table>


            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                        &laquo;  Prev
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
                        Next &raquo;
                    </button>
                </div>
                </div>
            )}

            {showModal && selectedOrder && (
                <div
                    className="order-modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="order-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="order-modal-header">
                            <h2>Invoice #{selectedOrder.invoiceId}</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        {/* Box 1: Customer Details */}
                        <h3><MdPerson size={24} /> Customer Details</h3>
                        <div className="order-box" style={{ marginLeft: '40px', marginTop: '20px' }}>

                            <div className="detail-item" >
                                <MdPerson size={20} color="var(--primary-color)" />
                                <span><strong>Customer:</strong> {selectedOrder.customerName}</span>
                            </div>
                            <div className="detail-item">
                                <MdEmail size={20} color="var(--primary-color)" />
                                <span><strong>Email:</strong> {selectedOrder.customerEmail}</span>
                            </div>
                            <div className="detail-item">
                                <MdPhone size={20} color="var(--primary-color)" />
                                <span><strong>Phone:</strong> {selectedOrder.customerPhone}</span>
                            </div>
                            <div className="detail-item">
                                {selectedOrder.paid ? (
                                    <MdCheckCircle size={20} color="green" />
                                ) : (
                                    <MdCancel size={20} color="red" />
                                )}
                                <span>
                              <strong>Status:</strong> {selectedOrder.paid ? "Paid" : "Pending"}
                                </span>
                            </div>
                        </div>

                        {/* Box 2: Order Items */}
                        <div className="order-box">
                            <h3><MdShoppingCart size={24} /> Order Items</h3>
                            <table className="order-items-table">
                                <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Description</th>
                                    <th>Cost (each)</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                </tr>
                                </thead>
                                <tbody>
                                {selectedOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productName}</td>
                                        <td>{item.details}</td>
                                        <td>₹{(item.unitPrice / item.quantity).toLocaleString()}</td>
                                        <td>{item.quantity.toLocaleString()}</td>
                                        <td>₹{item.unitPrice.toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>


                        {/* Box 3: Totals & GST */}
                        <div className="order-box">
                            {selectedOrder.subTotal !== undefined && (
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{selectedOrder.subTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.tax !== undefined && (
                                <div className="summary-row">
                                    <span>Tax</span>
                                    <span>₹{selectedOrder.tax.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.discount !== undefined && (
                                <div className="summary-row">
                                    <span>Discount</span>
                                    <span style={{ color: 'red' }}>
              -₹{selectedOrder.discount.toLocaleString()}
            </span>
                                </div>
                            )}

                            <div className="summary-divider" />
                            {selectedOrder.gstRate !== undefined && (
                                <div className="summary-row" style={{ fontWeight: 'bold' }}>
                                    <span className="gstTotal">GST</span>
                                    <span className="gstTotal">₹{selectedOrder.gstRate.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="total-amount">
                                <span>Total</span>
                                <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}




        </div>
    );
};

export default SalesPage;
