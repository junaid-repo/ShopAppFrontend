import React, { useState, useEffect } from 'react';
import { useBilling } from '../context/BillingContext';
import Modal from '../components/Modal';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './BillingPage.css';
import { useConfig } from "./ConfigProvider";

const BillingPage = () => {
    const {
        selectedCustomer, setSelectedCustomer,
        cart, addProduct, removeProduct,
        paymentMethod, setPaymentMethod,
        clearBill, products, loadProducts
    } = useBilling();
    const [remarks, setRemarks] = useState("");
    const [customersList, setCustomersList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [orderRef, setOrderRef] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [sellingPrices, setSellingPrices] = useState({}); // <-- Selling Price state

    // --- filter products ---
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
    const token = localStorage.getItem('jwt_token');
    const [searchTerm, setSearchTerm] = useState('');

    const config = useConfig();
    var apiUrl = "";

    if (config) {
        apiUrl = config.API_URL;
    }

    // --- API CALL TO FETCH CUSTOMERS & PRODUCTS ---
    useEffect(() => {
        fetch(`${apiUrl}/api/shop/get/customersList`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(setCustomersList)
            .catch(err => console.error("Error fetching customers:", err));

        if (products.length === 0) {
            fetchProductsFromAPI();
        }
        // eslint-disable-next-line
    }, []);

    const fetchProductsFromAPI = () => {
        fetch(`${apiUrl}/api/shop/get/productsList`, {
            method: "GET",
            headers: {

                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                const inStockProducts = data.filter(p => p.stock > 0);
                loadProducts(inStockProducts);

                // initialize selling prices for fetched products (default = actual price)
                const initialPrices = {};
                inStockProducts.forEach(p => { initialPrices[p.id] = p.price; });
                setSellingPrices(prev => ({ ...initialPrices, ...prev }));
            })
            .catch(err => console.error("Error fetching products:", err));
    };

    // keep sellingPrices initialized for products that might come from context (preserve any user edits)
    useEffect(() => {
        setSellingPrices(prev => {
            const next = { ...prev };
            products.forEach(p => {
                if (next[p.id] === undefined) next[p.id] = p.price;
            });
            return next;
        });
    }, [products]);

    // --- add product handler that attaches sellingPrice to the product object ---
    const handleAddProduct = (p) => {
        const sellingPrice = sellingPrices[p.id] !== undefined ? sellingPrices[p.id] : p.price;
        addProduct({ ...p, sellingPrice });
    };

    // --- MODIFIED: API CALL TO CREATE AND SELECT A NEW CUSTOMER (WITH DEBUGGING) ---
    const handleAddCustomer = async (e) => {
        e.preventDefault();

        const payload = { name, email, phone };

        // DEBUG: Let's see what we are sending
        console.log("Attempting to create customer with payload:", payload);

        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            // DEBUG: Check the raw response from the server
            console.log("API Response Status:", response.status, response.statusText);

            if (!response.ok) {
                // If the response is not OK, log the error message from the server
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }

            const newCustomer = await response.json();

            // DEBUG: Check what we received and parsed as JSON
            console.log("✅ Successfully parsed new customer:", newCustomer);

            // This part will only run if the above lines succeed
            setCustomersList(prevList => [...prevList, newCustomer]);
            setSelectedCustomer(newCustomer);

            console.log("Customer state has been updated.");

            setName("");
            setEmail("");
            setPhone("");
            setIsNewCusModalOpen(false);

        } catch (error) {
            // DEBUG: This will catch any failure in the try block
            console.error("❌ Error adding customer:", error);
            alert(`Failed to add customer. Please check the console for details.`);
        }
    };


    // enrich cart items with per-product discount %
    const cartWithDiscounts = cart.map(item => {
        const perProductDiscount = item.price > 0
            ? (((item.price - (item.sellingPrice || item.price)) / item.price) * 100).toFixed(2)
            : 0;
        return {
            ...item,
            discountPercentage: perProductDiscount
        };
    });

    // --- API CALL TO PROCESS THE PAYMENT ---
    const HandleProcessPayment = () => {
        if (!selectedCustomer || cart.length === 0) {
            alert('Please select a customer and add products.');
            return;
        }
        const payload = { selectedCustomer, cart: cartWithDiscounts, total, discountPercentage, tax, paymentMethod, remarks };

        // 🔴 API may need changes here to accept `sellingPrice` for each cart item
        fetch(`${apiUrl}/api/shop/do/billing`, {
            method: "POST",
            headers: { "Content-Type": "application/json",'Authorization': `Bearer ${token}` },

            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(data => {
                setOrderRef(data.invoiceNumber || 'N/A');
                setPaidAmount(total);
                setShowPopup(true);
                handleNewBilling();
            })
            .catch(err => {
                console.error("Billing failed:", err);
                alert("Billing failed.");
            });
    };

    const handleNewBilling = () => {
        clearBill();
        fetchProductsFromAPI();
    };

    // --- CALCULATIONS ---
    // actualSubtotal = based on real price saved in product.price
    // sellingSubtotal = based on sellingPrice (user editable). Totals/tax are calculated from sellingSubtotal.
    const actualSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const sellingSubtotal = cart.reduce((total, item) => total + ((item.sellingPrice !== undefined ? item.sellingPrice : item.price) * item.quantity), 0);
    const tax = sellingSubtotal * 0.18;
    const total = sellingSubtotal + tax;
    const discountPercentage = actualSubtotal > 0 ? (((actualSubtotal - sellingSubtotal) / actualSubtotal) * 100).toFixed(2) : 0;

    const filteredCustomers = customersList.filter(customer => {
        const nameMatch = customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = customer.phone && customer.phone.includes(searchTerm);
        return nameMatch || phoneMatch;
    });

    return (
        <div className="billing-page">
            <h2>Billing</h2>
            <div className="billing-layout">
                <div className="product-list glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Available Products</h3>
                        {selectedCustomer && (
                            <button className="btn" onClick={handleNewBilling}>
                                New Billing
                            </button>
                        )}
                    </div>

                    {/* 🔍 Search bar */}
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px', margin: '10px 0' }}
                    />

                    <div className="product-table-wrapper">
                        <table className="beautiful-table">
                            <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price (₹)</th>
                                <th>Selling Price (₹)</th>
                                <th>Stock</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id} className={p.stock <= 0 ? "out-of-stock" : ""}>
                                    <td>{p.name}</td>
                                    <td>{p.price}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={sellingPrices[p.id] !== undefined ? sellingPrices[p.id] : p.price}
                                            onChange={(e) =>
                                                setSellingPrices({ ...sellingPrices, [p.id]: Number(e.target.value) })
                                            }
                                            // small inline styling only for selling price box (requested)
                                            style={{
                                                width: "80px",
                                                padding: "3px 6px",
                                                borderRadius: "25px",
                                                border: "1.5px solid var(--border-color)",
                                                borderColor: "skyblue",
                                                textAlign: "center",
                                                fontSize: "0.9rem"
                                            }}
                                        />
                                    </td>
                                    <td>{p.stock}</td>
                                    <td>
                                        <button
                                            className="btn small-btn"
                                            onClick={() => handleAddProduct(p)}
                                            disabled={p.stock <= 0}
                                            title={p.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                                        >
                                            <FaPlus />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>No matching products.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="invoice-details glass-card">
                    <h3 style={{ textAlign: 'center' }}>Current Bill</h3>
                    <div className="customer-actions" style={{ marginBottom: '0.75rem', display: 'flex', gap: '10px' }}>
                        <button className="btn" onClick={() => setIsModalOpen(true)}>
                            {selectedCustomer ? 'Reselect Customer' : 'Select Customer'}
                        </button>
                        <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>
                            <FaPlus /> Create Customer
                        </button>
                    </div>
                    {selectedCustomer && (
                        <p style={{ marginTop: 0 }}>Customer: <strong>{selectedCustomer.name}</strong></p>
                    )}
                    <div className="cart-items">
                        {cart.length === 0 ? <p>No items in cart.</p> : cart.map(item => (
                            <div className="cart-item" key={item.id}>
                                <span>{item.name} (x{item.quantity})</span>
                                <span>
                  {/* show actual price (small + light) and selling price beside it */}
                                    <span style={{ fontSize: '0.85rem', color: '#777', marginRight: '8px' }}>
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </span>
                  <span>
                    ₹{(((item.sellingPrice !== undefined ? item.sellingPrice : item.price) * item.quantity)).toLocaleString()}
                  </span>
                </span>
                                <button className="remove-btn" onClick={() => removeProduct(item.id)}>
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="invoice-summary">
                        <p className="subtotal-actual">
                            Subtotal (Actual): <span>₹{actualSubtotal.toLocaleString()}</span>
                        </p>
                        <p className="subtotal-selling">
                            Subtotal (Selling): <span>₹{sellingSubtotal.toLocaleString()}</span>
                        </p>
                        <p className="discount">
                            Discount %: <span>{discountPercentage}%</span>
                        </p>
                        <p className="tax">
                            Tax (18%): <span>₹{tax.toLocaleString()}</span>
                        </p>

                        <h4>Total: <span>₹{total.toLocaleString()}</span></h4>
                        <div className="remarks-section" style={{ margin: '1rem 0' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                                Remarks:
                            </label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any remarks for this bill..."
                                style={{
                                    width: '100%',
                                    minHeight: '60px',
                                    padding: '10px',
                                    borderRadius: '15px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--glass-bg)',
                                    resize: 'vertical',
                                    fontSize: '1rem',
                                    color: 'var(--text-color)'
                                }}
                            />
                        </div>
                        <div className="payment-methods" style={{ marginTop: '1rem' }}>
                            <h5 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Payment Method:</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { type: 'CASH', color: '#00aaff', icon: '💵' },
                                    { type: 'CARD', color: '#0077cc', icon: '💳' },
                                    { type: 'UPI', color: '#3399ff', icon: '📱' }
                                ].map(method => (
                                    <label
                                        key={method.type}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '25px',
                                            border: `1px solid ${paymentMethod === method.type ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            background: paymentMethod === method.type ? 'var(--primary-color-light)' : 'var(--glass-bg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontWeight: '500',
                                            color: 'var(--text-color)'
                                        }}
                                    >
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: method.color,
                color: 'white',
                fontSize: '0.9rem'
            }}
        >
          {method.icon}
        </span>
                                        <input
                                            type="radio"
                                            value={method.type}
                                            checked={paymentMethod === method.type}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                            style={{ accentColor: 'var(--primary-color)' }}
                                        />
                                        {method.type}
                                    </label>
                                ))}
                            </div>
                        </div>


                    </div>
                    <button className="btn process-payment-btn" onClick={HandleProcessPayment}>Process Payment</button>
                    {showPopup && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 2000,
                                animation: 'fadeIn 0.3s ease'
                            }}
                            onClick={() => setShowPopup(false)}
                        >
                            <div
                                style={{
                                    background: 'var(--glass-bg)',
                                    padding: '2rem',
                                    borderRadius: '25px',
                                    width: '90%',
                                    maxWidth: '500px',
                                    boxShadow: '0 8px 30px var(--shadow-color)',
                                    color: 'var(--text-color)',
                                    border: '1px solid var(--border-color)',
                                    textAlign: 'center',
                                    animation: 'slideIn 0.3s ease',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem', fontSize: '1.8rem' }}>
                                    ✅ Payment Successful
                                </h2>
                                <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                                    Order Reference: <strong>{orderRef}</strong>
                                </p>
                                <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                                    Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong>
                                </p>
                                <button
                                    style={{
                                        marginTop: '1.5rem',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '25px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setShowPopup(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}


                </div>
            </div>
            <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
                />
                <ul className="customer-modal-list">
                    <li
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: "bold",
                            borderBottom: "1px solid #ccc",
                            padding: "8px 0",
                            background: "#f7f7f7"
                        }}
                    >
                        <span>Name</span>
                        <span>Phone</span>
                        <span>Total Spent</span>
                    </li>
                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                        <li key={c.id} onClick={() => { setSelectedCustomer(c); setIsModalOpen(false); setSearchTerm(''); }}>
                            <span>{c.name}</span>
                            <span style={{ color: '#555', fontSize: '0.9em' }}>{c.phone}</span>
                            <span style={{ color: '#555', fontSize: '0.9em' }}>₹ {c.totalSpent}</span>
                        </li>
                    )) : (
                        <li>No customers found.</li>
                    )}
                </ul>
            </Modal>
            <Modal title="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>
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
                        <button type="submit" className="btn">Add & Select Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000
};

const popupStyle = {
    background: '#fff',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    width: '300px'
};

export default BillingPage;
