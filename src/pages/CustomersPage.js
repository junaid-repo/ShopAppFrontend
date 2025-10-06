import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import './CustomersPage.css';
import { FaEnvelope, FaPhone, FaMoneyBillWave, FaTrash, FaThLarge, FaList, FaCheckDouble } from 'react-icons/fa';
import { useConfig } from "./ConfigProvider";
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchKey } from '../context/SearchKeyContext';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const CustomersPage = ({ setSelectedPage }) => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const [viewMode, setViewMode] = useState(
        () => localStorage.getItem('customerViewMode') || 'grid'
    );
    const domainToRoute = {
        products: 'products',
        sales: 'sales',
        customers: 'customers',
    };
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedCustomers, setSelectedCustomers] = useState(new Set());


    const config = useConfig();
    const ITEMS_PER_PAGE = 12;
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const location = useLocation();
    const { searchKey, setSearchKey } = useSearchKey();

    const apiUrl = config ? config.API_URL : '';

    useEffect(() => {
        localStorage.setItem('customerViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        return () => setSearchKey('');
    }, [setSearchKey]);

    const fetchCustomers = useCallback(async (page = 1) => {
        if (!apiUrl) return;

        setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
            url.searchParams.append('page', page);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            if (debouncedSearchTerm) url.searchParams.append('search', debouncedSearchTerm);

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            setCustomers(result.data || []);
            setTotalPages(result.totalPages || 0);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching customers:", error);
            alert("Something went wrong while fetching customers.");
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, debouncedSearchTerm]);

    useEffect(() => {
        fetchCustomers(currentPage);
    }, [fetchCustomers, currentPage]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) setSearchTerm(key);
    }, [location.search]);

    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) setSearchTerm(searchKey);
    }, [searchKey]);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, email, phone };
            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            fetchCustomers(1);
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Something went wrong while adding the customer.");
        }
        setIsModalOpen(false);
    };

    const handleDeleteCustomer = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/customer/delete/${id}`, {
                method: "DELETE",
                credentials: 'include',
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return { status: 'fulfilled', id };
        } catch (error) {
            console.error(`Error deleting customer ${id}:`, error);
            alert(`Something went wrong while deleting customer ${id}.`);
            return { status: 'rejected', id, error };
        }
    };

    const handleToggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedCustomers(new Set());
    };

    const handleSelectCustomer = (customerId) => {
        const newSelection = new Set(selectedCustomers);
        if (newSelection.has(customerId)) {
            newSelection.delete(customerId);
        } else {
            newSelection.add(customerId);
        }
        setSelectedCustomers(newSelection);
    };

    const handleBulkDelete = async () => {
        if (selectedCustomers.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) return;

        const deletePromises = Array.from(selectedCustomers).map(id => handleDeleteCustomer(id));
        await Promise.allSettled(deletePromises);

        setSelectedCustomers(new Set());
        setIsSelectMode(false);
        fetchCustomers(1);
    };

    const handleTakeAction = (customerName) => {
        const route = domainToRoute['sales'];
        if (!route) return;
        setSearchKey(customerName);
        if (setSelectedPage) {
            setSelectedPage(route);
        }
    };


    const Pagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="pagination">
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>&laquo; Prev</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Next &raquo;</button>
            </div>
        );
    };

    return (
        <div className="page-container">
            <h2>Customers</h2>
            <div className="page-header">
                <div className="header-actions">
                    {isSelectMode ? (
                        <>
                            <button className="btn btn-danger" onClick={handleBulkDelete} disabled={selectedCustomers.size === 0}>
                                <FaTrash /> Delete ({selectedCustomers.size})
                            </button>
                            <button className="btn btn-secondary" onClick={handleToggleSelectMode}>Cancel</button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchTerm}
                                className="search-bar"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="view-toggle-buttons">
                                <button
                                    className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    title="Grid View"
                                >
                                    <FaThLarge />
                                </button>
                                <button
                                    className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    title="Table View"
                                >
                                    <FaList />
                                </button>
                            </div>
                            <button className="btn btn-icon" onClick={handleToggleSelectMode} title="Select Multiple">
                                <FaCheckDouble />
                            </button>
                            <button className="btn add-customer-btn" onClick={() => setIsModalOpen(true)}>New Customer</button>
                        </>
                    )}
                </div>

            </div>

            <div className="glass-card">
                {isLoading ? <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p> : (
                    viewMode === 'grid' ? (
                        <div className="customer-grid">
                            {customers.map(customer => {
                                const isSelected = selectedCustomers.has(customer.id);
                                return (
                                    <div key={customer.id}  className={`customer-card ${isSelected ? 'selected' : ''}`} onClick={() => isSelectMode ? handleSelectCustomer(customer.id) : handleTakeAction(customer.name)}>
                                        {isSelectMode && <input type="checkbox"  className="styled-checkbox" checked={isSelected} readOnly />}
                                        <h3>{customer.name}</h3>
                                        <p className="customer-info"><FaEnvelope className="icon" /> {customer.email}</p>
                                        <p className="customer-info spaced"><FaPhone className="icon" /> {customer.phone}</p>
                                        <p className="customer-info money"><FaMoneyBillWave className="icon" /> ₹{customer.totalSpent?.toLocaleString('en-IN')}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                <tr>
                                    {isSelectMode && <th><input type="checkbox"  disabled /></th>}
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Total Spent</th>
                                </tr>
                                </thead>
                                <tbody>
                                {customers.map(customer => {
                                    const isSelected = selectedCustomers.has(customer.id);
                                    return (
                                        <tr key={customer.id} className={isSelected ? 'selected' : ''} onClick={() => isSelectMode ? handleSelectCustomer(customer.id) : handleTakeAction(customer.name)}>
                                            {isSelectMode && <td><input type="checkbox" checked={isSelected} className="styled-checkbox" readOnly /></td>}
                                            <td>{customer.name}</td>
                                            <td>{customer.email}</td>
                                            <td>{customer.phone}</td>
                                            <td>₹{customer.totalSpent?.toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            <Pagination />

            <Modal title="Add New Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
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
                        <button  className="btn add-customer-btn">Add Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CustomersPage;