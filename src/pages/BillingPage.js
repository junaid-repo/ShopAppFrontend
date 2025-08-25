// src/pages/BillingPage.js
import React, { useState, useEffect } from 'react';
import { mockCustomers, mockProducts } from '../mockData';
import Modal from '../components/Modal';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './BillingPage.css';

const BillingPage = () => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customersList, setCustomersList]=useState([]);
    const [ProductsList, setProductsList]=useState([]);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod]= useState('CASH');
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
    const handleAddProduct = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    useEffect(() => {
      // Fetch customers
      fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/customersList")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => setCustomersList(data))
        .catch((err) => console.error("Error fetching customers:", err));

      // Fetch products
      fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/productsList")
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data) => setProductsList(data))
        .catch((err) => console.error("Error fetching products:", err));
    }, []);

    const handleRemoveProduct = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + tax;

    const HandleProcessPayment = () => {
        if (!selectedCustomer || cart.length === 0) {
            alert('Please select a customer and add products to the cart.');
            return;
        }
        //console.log('Processing payment for:', selectedCustomer, 'with cart:', cart);
        // API CALL: Create new sale/invoice
        // POST /api/sales
        const payload= { selectedCustomer, cart, total, tax, paymentMethod }
        console.log(payload);
        // Response: { success: true, sale: { ... } }


        {
          fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/do/billing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
             body: JSON.stringify(payload),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              console.log("billingResponse  " +response.invoiceNumber);
              setOrderRef(response.invoiceNumber);
                              setPaidAmount(total);
                              setShowPopup(true);
              return response.json();
            })
            .catch((error) => {
              console.error("Error fetching customers:", error);
              alert("Something went wrong while fetching customers.");
            });


        }


       // alert(`Payment of ₹${total.toFixed(2)} for ${selectedCustomer.name} processed successfully!`);
        setCart([]);
        setSelectedCustomer(null);
    }

    return (
        <div className="billing-page">
            <h2>Billing</h2>
            <div className="billing-layout">
                <div className="product-list glass-card">
                    <h3>Available Products</h3>
                    <input type="text" placeholder="Search products..." className="search-bar small-search" />
                    <ul>
                        {ProductsList.filter(p => p.stock > 0).map(p => (
                            <li key={p.id}>
                                <span>{p.name} - ₹{p.price}</span>
                                <button onClick={() => handleAddProduct(p)}><FaPlus /></button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="invoice-details glass-card">
                    <h3>Current Bill</h3>
                    <div className="customer-selection">
                        {selectedCustomer ? (
                            <p>Customer: <strong>{selectedCustomer.name}</strong></p>
                        ) : (
                            <button className="btn" onClick={() => setIsModalOpen(true)}>Select or Add Customer</button>
                        )}
                    </div>
                    <div className="cart-items">
                         {cart.length === 0 ? <p>No items in cart.</p> : cart.map(item => (
                            <div className="cart-item" key={item.id}>
                                <span>{item.name} (x{item.quantity})</span>
                                <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                                <button className="remove-btn" onClick={() => handleRemoveProduct(item.id)}><FaTrash /></button>
                            </div>
                         ))}
                    </div>
                    <div className="invoice-summary">
                        <p>Subtotal: <span>₹{subtotal.toLocaleString()}</span></p>
                        <p>Tax (18%): <span>₹{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <h4>Total: <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h4>
                         {/* Payment method radio group */}
                          <div className="payment-methods" style={{ marginTop: '1rem' }}>
                            <h5>Payment Method:</h5>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="CASH"
                                checked={paymentMethod === 'CASH'}
                                onChange={e => setPaymentMethod(e.target.value)}
                              />{' '}
                              💵 Cash
                            </label>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="CARD"
                                checked={paymentMethod === 'CARD'}
                                onChange={e => setPaymentMethod(e.target.value)}
                              />{' '}
                              💳 Card
                            </label>
                            <label style={{ display: 'block' }}>
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="UPI"
                                checked={paymentMethod === 'UPI'}
                                onChange={e => setPaymentMethod(e.target.value)}
                              />{' '}
                              📱 UPI
                            </label>
                          </div>


                    </div>

                    <button className="btn process-payment-btn" onClick={HandleProcessPayment}>Process Payment</button>
                                  {showPopup && (
                                    <div style={overlayStyle}>
                                      <div style={popupStyle}>
                                        <h3>✅ Payment Successful</h3>
                                        <p>Order Reference: <strong>{orderRef}</strong></p>
                                        <p>Amount Paid: <strong>₹{paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                                        <button onClick={() => setShowPopup(false)}>Close</button>
                                      </div>
                                    </div>
                                  )}
                </div>
            </div>

             <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div>
                    {/* In a real app, this would also have a search bar */}
                    <h4>Existing Customers</h4>
                    <ul className="customer-modal-list">
                    {customersList.map(c => (
                        <li key={c.id} onClick={() => { setSelectedCustomer(c); setIsModalOpen(false); }}>
                            {c.name}
                        </li>
                    ))}
                    </ul>
                    <hr />
                    {/* Add new customer form can be integrated here */}
                    <button className="btn">Add New Customer</button>
                </div>
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