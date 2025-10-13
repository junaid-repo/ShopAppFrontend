    import React, { useState, useEffect, useCallback } from 'react';
    import Modal from '../components/Modal';
    import './CustomersPage.css';
    import { FaEnvelope, FaPhone, FaMoneyBillWave, FaTrash, FaThLarge, FaList, FaCheckDouble } from 'react-icons/fa';
    import { useConfig } from "./ConfigProvider";
    import { useLocation, useNavigate } from 'react-router-dom';
    import { useSearchKey } from '../context/SearchKeyContext';
    import { MdEdit, MdDelete } from "react-icons/md";
    import { getIndianStates } from '../utils/statesUtil';
    import toast from 'react-hot-toast';
    import { useAlert } from '../context/AlertContext';
    
    const useDebounce = (value, delay) => {
    
        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const handler = setTimeout(() => setDebouncedValue(value), delay);
            return () => clearTimeout(handler);
        }, [value, delay]);
        return debouncedValue;
    };
    
    const CustomersPage = ({ setSelectedPage }) => {
        const { showAlert } = useAlert();
        const [customers, setCustomers] = useState([]);
        const [searchTerm, setSearchTerm] = useState('');
        const [name, setName] = useState("");
        const [id, setSelectedId] = useState("");
        const [email, setEmail] = useState("");
        const [phone, setPhone] = useState("");
        const [state, setState] = useState("");
        const [city, setCity] = useState("");
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [isLoading, setIsLoading] = useState(false);
        const [currentPage, setCurrentPage] = useState(1);
        const [totalPages, setTotalPages] = useState(0);
        const [customerState, setCustomerState] = useState("");
        const [shopState, setShopState] = useState("");
        const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
        const [viewMode, setViewMode] = useState(
            () => localStorage.getItem('customerViewMode') || 'grid'
        );
        const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    
    
        const domainToRoute = {
            products: 'products',
            sales: 'sales',
            customers: 'customers',
        };
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A'; // Handle cases where date is not available
            try {
                const date = new Date(dateString);
                // Add a check for invalid dates
                if (isNaN(date.getTime())) return 'Invalid Date';
    
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            } catch (error) {
                return 'Invalid Date';
            }
        };
        const handleSort = (key) => {
            let direction = 'asc';
            // If clicking the same column, toggle the direction
            if (sortConfig.key === key && sortConfig.direction === 'asc') {
                direction = 'desc';
            }
            setSortConfig({ key, direction });
            // Go back to the first page whenever the sort order changes
            setCurrentPage(1);
        };
        const [isSelectMode, setIsSelectMode] = useState(false);
        const [selectedCustomers, setSelectedCustomers] = useState(new Set());
        // ✅ 2. Add state to track which customer is being deleted
        const [deletingCustomerId, setDeletingCustomerId] = useState(null);
        const statesList = getIndianStates();
    
    
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
    
        // --- MODIFICATION 3: Update the API call to include sorting ---
    
        const fetchCustomers = useCallback(async (page = 1) => {
            if (!apiUrl) return;
    
            setIsLoading(true);
            try {
                const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
                url.searchParams.append('page', page);
                url.searchParams.append('limit', ITEMS_PER_PAGE);
                if (debouncedSearchTerm) url.searchParams.append('search', debouncedSearchTerm);
    
                // Add sorting parameters to the request
                url.searchParams.append('sort', sortConfig.key);
                url.searchParams.append('dir', sortConfig.direction);
    
                const response = await fetch(url, { method: "GET", credentials: 'include' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
                const result = await response.json();
                setCustomers(result.data || []);
                setTotalPages(result.totalPages || 0);
                setCurrentPage(page);
            } catch (error) {
                console.error("Error fetching customers:", error);
                showAlert("Something went wrong while fetching customers.");
                setCustomers([]);
            } finally {
                setIsLoading(false);
            }
    // Add sortConfig to the dependency array so the data re-fetches when it changes
        }, [apiUrl, debouncedSearchTerm, sortConfig]);
    
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
    
        useEffect(() => {
            const fetchShopDetails = async () => {
                try {
                    const username = null; // assuming username stored in localStorage
                    const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/${username}`, {
                        method: "GET",
                        credentials: 'include',
                        headers: { Accept: "application/json" },
                    });
                    if (detailsRes.ok) {
                        const data = await detailsRes.json();
                        setShopState(data?.shopState || '');
                        setCustomerState(data?.shopState || '');
                    }
                } catch (err) {
                    console.error("Error fetching shop details:", err);
                }
            };
            fetchShopDetails();
        }, [apiUrl]);
    
        const handleAddCustomer = async (e) => {
            e.preventDefault();
            try {
                const payload = { name, email, phone, city,  customerState};
    
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
                toast.error("Something went wrong while adding the customer.");
            }
            setIsModalOpen(false);
        };
        const handleUpdateCustomer = async (e) => {
            e.preventDefault();
            try {
                const payload = { id, name, email, phone, city,  customerState};
    
                const response = await fetch(`${apiUrl}/api/shop/update/customer`, {
                    method: "PUT",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                fetchCustomers(1);
                toast.success(`${name || 'Customer'} has been updated.`);
            } catch (error) {
                console.error("Error adding customer:", error);
                toast.error("Something went wrong while adding the customer.");
            }
            handleCloseUpdateModal();
        };
    
    
        // ✅ 3. MODIFIED: The handleDeleteCustomer function
        const handleDeleteCustomer = async (id, customerName) => {
            if (!window.confirm("Do your really want to delete customer:"+ customerName)) return;
    
            const customerToDelete = customers.find(c => c.id === id);
            if (!customerToDelete) return;
    
            // Start the animation
            setDeletingCustomerId(id);
    
            try {
                const response = await fetch(`${apiUrl}/api/shop/customer/delete/${id}`, {
                    method: "DELETE",
                    credentials: 'include',
                });
    
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
    
                // Show success message
                toast.success(`${customerName || 'Customer'} has been deleted.`);
    
                // Wait for the animation to finish (500ms) before removing from state
                setTimeout(() => {
                    setCustomers(prevCustomers => prevCustomers.filter(customer => customer.id !== id));
                    setDeletingCustomerId(null); // Reset animation state
                }, 500);
    
                return { status: 'fulfilled', id };
    
            } catch (error) {
                console.error(`Error deleting customer ${id}:`, error);
                toast.error(`Failed to delete ${customerName || 'customer'}.`);
                // Reset animation state on failure
                setDeletingCustomerId(null);
                return { status: 'rejected', id, error };
            }
        };
    
        const handleEditClick = (customer) => {
            setSelectedId(customer.id);
            setName(customer.name);
            setEmail(customer.email);
            setPhone(customer.phone);
            setState(customer.state);
            setCity(customer.city || "");
            setShopState(customer.shopState);
            setIsUpdateModalOpen(true);
        };
    
        const handleCloseUpdateModal = () => {
            setIsUpdateModalOpen(false); // This closes the modal
            resetForm();               // This clears the form fields
        };
        const resetForm = () => {
            setSelectedId("");
            setName("");
            setEmail("");
            setPhone("");
            setState("");
            setCity("");
            setShopState("");
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
                                        <div
                                            key={customer.id}
                                            className={`customer-card ${isSelected ? 'selected' : ''} ${deletingCustomerId === customer.id ? 'deleting' : ''}`}
                                            onClick={() => isSelectMode ? handleSelectCustomer(customer.id) : handleTakeAction(customer.name)}
                                        >
                                            {isSelectMode && <input type="checkbox"  className="styled-checkbox" checked={isSelected} readOnly />}
                                            <h3>{customer.name}</h3>
                                           <div style={{marginTop:"20px"}}>
                                               <h4 style={{marginBottom:"10px"}}>{customer.city}, {customer.state}</h4>
                                            <p className="customer-info"><FaEnvelope className="icon" /> {customer.email}</p>
                                            <p className="customer-info spaced"><FaPhone className="icon" /> {customer.phone}</p>
                                           </div>
                                            <p className="customer-info money"><FaMoneyBillWave className="icon" /> ₹{customer.totalSpent?.toLocaleString('en-IN')}</p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(customer);
                                                }}
                                                className="edit-btn"
                                                title="Edit Customer"
                                            >
                                        <MdEdit size={18}/>
                                    </button>
                                            <button className="delete-btn" onClick={(e) =>{e.stopPropagation();  handleDeleteCustomer(customer.id, customer.name)}}>
                                                <MdDelete />
                                            </button>
    
    
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                    <tr>
                                        {isSelectMode && <th><input type="checkbox" disabled /></th>}
                                        {/* --- MODIFICATION 4: Make headers clickable and add sort icons --- */}
                                        <th className="sortable-header" onClick={() => handleSort('name')}>
                                            Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="sortable-header" onClick={() => handleSort('email')}>
                                            Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="sortable-header" onClick={() => handleSort('phone')}>
                                            Phone {sortConfig.key === 'phone' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="sortable-header" onClick={() => handleSort('state')}>
                                            State {sortConfig.key === 'state' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="sortable-header" onClick={() => handleSort('city')}>
                                            City {sortConfig.key === 'city' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="sortable-header" onClick={() => handleSort('totalSpent')}>
                                            Total Spent {sortConfig.key === 'totalSpent' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        {/* --- MODIFICATION 5: Add the new Created Date column --- */}
                                        <th className="sortable-header" onClick={() => handleSort('createdDate')}>
                                            Created Date {sortConfig.key === 'createdDate' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th>Action</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {customers.map(customer => {
                                        const isSelected = selectedCustomers.has(customer.id);
                                        return (
                                            <tr
                                                key={customer.id}
                                                className={`${isSelected ? 'selected' : ''} ${deletingCustomerId === customer.id ? 'deleting' : ''}`}
                                                onClick={() => isSelectMode ? handleSelectCustomer(customer.id) : handleTakeAction(customer.name)}
                                            >
                                                {isSelectMode && <td><input type="checkbox" checked={isSelected} className="styled-checkbox" readOnly /></td>}
                                                <td>{customer.name}</td>
                                                <td>{customer.email}</td>
                                                <td>{customer.phone}</td>
                                                <td>{customer.state}</td>
                                                <td>{customer.city}</td>
                                                <td>₹{customer.totalSpent?.toLocaleString('en-IN')}</td>
                                                {/* --- MODIFICATION 6: Render the formatted createdDate --- */}
                                                <td>{formatDate(customer.createdDate)}</td>
                                                <td>
                                                    <div className="action-icons">
                                <span
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                                    className="action-icon edit"
                                    title="Edit Customer"
                                >
                                    <MdEdit size={18} />
                                </span>
                                                        <span
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id, customer.name); }}
                                                            className="action-icon delete"
                                                            title="Delete Customer"
                                                        >
                                    <MdDelete size={18} />
                                </span>
                                                    </div>
                                                </td>
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
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                // --- Validation Attributes Added Below ---
                                maxLength="10"
                                pattern="[5-9][0-9]{9}"
                                title="Phone number must be 10 digits and start with 5, 6, 7, 8, or 9"
                            />
                        </div>
                        <div className="form-group">
                            <label>State</label>
                            <select value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                                <option value="">Select State</option>
                                {statesList.map((state, i) => (
                                    <option key={i} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button  className="btn add-customer-btn">Add Customer</button>
                        </div>
                    </form>
                </Modal>
    
                <Modal title="Edit Customer" show={isUpdateModalOpen} onClose={handleCloseUpdateModal}>
                    <form onSubmit={handleUpdateCustomer}>
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
                        <div className="form-group">
                            <label>State</label>
                            <select value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                                <option value="">Select State</option>
                                {statesList.map((state, i) => (
                                    <option key={i} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button  className="btn add-customer-btn">Update Customer</button>
                        </div>
                    </form>
                </Modal>
    
            </div>
        );
    };
    
    export default CustomersPage;