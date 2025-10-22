import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import {MdDownload} from "react-icons/md";
import './SalesPage.css';
import { formatDate } from "../utils/formatDate";
import { useAlert } from '../context/AlertContext';
import {PaperPlaneTilt} from "@phosphor-icons/react";
import { FaPaperPlane } from 'react-icons/fa';

import toast, {Toaster} from 'react-hot-toast';

import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdShoppingCart,
    MdClose,
    MdCheckCircle,
    MdCancel,
    MdNotifications,
    MdSend,
    MdPayment
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
    const [showReminderModal, setShowReminderModal] = useState(false); // <-- NEW
    const [currentReminderInvoiceId, setCurrentReminderInvoiceId] = useState(null); // <-- NEW
    const [reminderMessage, setReminderMessage] = useState(""); // <-- NEW
    const [sendViaEmail, setSendViaEmail] = useState(true); // <-- NEW, default to email
    const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false); // <-- NEW

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null); // Will hold {id, total, paid}
    const [payingAmount, setPayingAmount] = useState(""); // Input is a string
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false); // For loading state

    const [hoveredReminderBtnId, setHoveredReminderBtnId] = useState(null);

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

    const handleOpenReminderModal = (saleId) => {
        setCurrentReminderInvoiceId(saleId);
        setReminderMessage(""); // Clear previous message
        setSendViaEmail(true); // Reset to default
        setSendViaWhatsapp(false); // Reset to default
        setShowReminderModal(true);
    };

    const handleConfirmSendReminder = async () => {
        if (!currentReminderInvoiceId) return;

        // Basic validation: ensure at least one channel is selected
        if (!sendViaEmail && !sendViaWhatsapp) {
            showAlert("Please select at least one channel (Email or WhatsApp).", "warning");
            return;
        }

        try {
            const payload = {
                message: reminderMessage, // The optional message from the textbox
                sendViaEmail: sendViaEmail,
                sendViaWhatsapp: sendViaWhatsapp,
                orderId: currentReminderInvoiceId
            };

            await axios.post(
                `${apiUrl}/api/shop/payment/send-reminder`,
                payload,
                { withCredentials: true }
            );

            // On success, update the local state to reflect the new count
            setSales(currentSales =>
                currentSales.map(sale =>
                    sale.id === currentReminderInvoiceId
                        ? { ...sale, reminderCount: (sale.reminderCount || 0) + 1 }
                        : sale
                )
            );

            toast.success('Reminder sent successfully!', 'success');
            setShowReminderModal(false); // Close modal on success
            setReminderMessage(""); // Clear message
            setCurrentReminderInvoiceId(null); // Clear invoice ID

        } catch (error) {
            console.error("Error sending reminder:", error);
            showAlert("Failed to send the reminder. Please try again.");
        }
    };

    const handleOpenPaymentModal = (sale) => {
        setCurrentPaymentOrder(sale);
        setPayingAmount(""); // Clear old amount
        setShowPaymentModal(true);
    };

    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;

        const amount = parseFloat(payingAmount);
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;

        // --- Validation ---
        if (isNaN(amount) || amount <= 0) {
            showAlert("Please enter a valid payment amount.", "warning");
            return;
        }
        // Use a small tolerance (e.g., 0.01) for float comparison
        if (amount > dueAmount + 0.01) {
            showAlert(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`, "warning");
            return;
        }

        setIsUpdatingPayment(true);
        try {
            const payload = {
                invoiceId: currentPaymentOrder.id,
                amount: amount
            };

            // Assuming a new endpoint /api/shop/payment/update
            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, {
                withCredentials: true,
            });

            // Update local state on success
            setSales(prevSales =>
                prevSales.map(sale => {
                    if (sale.id === currentPaymentOrder.id) {
                        const newPaidAmount = sale.paid + amount;
                        // Check if new paid amount is >= total (with tolerance)
                        const newStatus = (newPaidAmount + 0.01) >= sale.total ? 'Paid' : 'SemiPaid';
                        return {
                            ...sale,
                            paid: newPaidAmount,
                            status: newStatus
                        };
                    }
                    return sale;
                })
            );

            showAlert("Payment updated successfully!", "success");
            setShowPaymentModal(false);
            setCurrentPaymentOrder(null);

        } catch (error) {
            console.error("Error updating payment:", error);
            showAlert("Failed to update payment. Please try again.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };


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
        toast.success("Invoice downloaded!");
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

    const handleSendReminder = async (saleId) => {
        try {
            // This assumes a POST request to an endpoint like /api/shop/send-reminder/{invoiceId}
            await axios.post(`${apiUrl}/api/shop/send-reminder/${saleId}`, {}, {
                withCredentials: true,
            });

            // On success, update the local state to reflect the new count
            setSales(currentSales =>
                currentSales.map(sale =>
                    sale.id === saleId
                        ? { ...sale, reminderCount: (sale.reminderCount || 0) + 1 }
                        : sale
                )
            );

            toast.success('Reminder sent successfully!', 'success');

        } catch (error) {
            console.error("Error sending reminder:", error);
            showAlert("Failed to send the reminder. Please try again.");
        }
    };

    return (
        <div className="page-container">
            <Toaster position="top-center" toastOptions={{
                duration: 8000,
                style: {
                    background: 'lightgreen',
                    color: 'var(--text-color)',
                    borderRadius: '25px',
                    padding: '12px',
                    width: '100%',
                    fontSize: '16px',
                },
            }}   reverseOrder={false} />
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

                        <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('paid')}>
                            Paid {hasSortActive && sortConfig.key === 'paid' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>

                        {/* This key 'status' should be verified against your backend model */}
                        <th>Status</th>


                        <th>Invoice</th>
                        <th>Remind</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map((sale) => {
                        // Check if this button is hovered
                        const isRemindHovered = hoveredReminderBtnId === sale.id;

                        return (
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
                                <td>₹{sale.paid.toLocaleString()}</td>
                                <td>
                    <span className={sale.status === 'Paid' ? 'status-paid' : 'status-pending'}>
                        {sale.status}
                    </span>
                                </td>
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
                                        <MdDownload size={18} color="var(--primary-color)" />
                                    </button>
                                </td>
                                <td>
                                    {(sale.total !== sale.paid) && ( // Check if not fully paid
                                        <button
                                            className="reminder-btn"
                                            title="Send Payment Reminder"
                                            onMouseEnter={() => setHoveredReminderBtnId(sale.id)}
                                            onMouseLeave={() => setHoveredReminderBtnId(null)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenReminderModal(sale.id);
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                borderRadius: "6px",
                                                padding: "6px 8px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "5px",
                                                background: "var(--small-bg-cyan)", // Use your theme variable
                                                border: "1px solid var(--border-color)", // Use your theme variable
                                                transition: 'all 0.2s ease',
                                                // Apply hover styles conditionally
                                                transform: isRemindHovered ? 'scale(1.1)' : 'scale(1)',
                                                opacity: isRemindHovered ? 0.8 : 1
                                            }}
                                        >
                                            <FaPaperPlane size={18} color="var(--primary-color)" />
                                            <span style={{ fontWeight: "bold", fontSize: "0.9em", color: "var(--text-color)" }}>
                                {sale.reminderCount || 0}
                            </span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
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
                              <strong>Status:</strong> {selectedOrder.paid ? "Paid" : "Partially Paid"}
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

            {showReminderModal && (
                <div className="order-modal-overlay" onClick={() => setShowReminderModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="order-modal-header">
                            <h2>Send Reminder for Invoice #{currentReminderInvoiceId}</h2>
                            <button className="close-button" onClick={() => setShowReminderModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Message (Optional):
                                </label>
                                <textarea
                                    value={reminderMessage}
                                    onChange={(e) => setReminderMessage(e.target.value)}
                                    placeholder="Add a custom message for the reminder..."
                                    rows="4"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-color)',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Send via:
                                </label>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            onChange={(e) => setSendViaEmail(e.target.checked)}
                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)' }}
                                        />
                                        Email
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sendViaWhatsapp}
                                            onChange={(e) => setSendViaWhatsapp(e.target.checked)}
                                            style={{ transform: 'scale(1.2)', accentColor: 'var(--primary-color)' }}
                                        />
                                        WhatsApp
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    className="btn"
                                    onClick={() => setShowReminderModal(false)}
                                    style={{ background: 'var(--glass-card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleConfirmSendReminder}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <MdSend size={18} /> Send Reminder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showPaymentModal && currentPaymentOrder && (
                <div className="order-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="order-modal-header">
                            <h2>Update Payment for #{currentPaymentOrder.id}</h2>
                            <button className="close-button" onClick={() => setShowPaymentModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {/* Payment Summary Details */}
                            <div className="payment-summary-box" style={{ marginBottom: '20px', padding: '15px', background: 'var(--glass-bg)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px'}}>
                                    <span>Total Amount:</span>
                                    <strong>₹{currentPaymentOrder.total.toLocaleString()}</strong>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', marginBottom: '10px'}}>
                                    <span>Amount Paid:</span>
                                    <strong style={{color: 'green'}}>₹{currentPaymentOrder.paid.toLocaleString()}</strong>
                                </div>
                                <hr style={{border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0'}} />
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold'}}>
                                    <span>Amount Due:</span>
                                    <strong style={{color: '#d32f2f'}}>₹{(currentPaymentOrder.total - currentPaymentOrder.paid).toLocaleString()}</strong>
                                </div>
                            </div>

                            {/* Payment Input */}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Enter Paying Amount:
                                </label>
                                <input
                                    type="number"
                                    value={payingAmount}
                                    onChange={(e) => setPayingAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-color)',
                                        fontSize: '1.2rem',
                                        textAlign: 'right'
                                    }}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    className="btn"
                                    onClick={() => setShowPaymentModal(false)}
                                    style={{ background: 'var(--glass-card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                                    disabled={isUpdatingPayment}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleConfirmUpdatePayment}
                                    disabled={isUpdatingPayment}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {isUpdatingPayment ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SalesPage;
