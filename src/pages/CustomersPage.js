import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import './CustomersPage.css';
import { FaEnvelope, FaPhone, FaMoneyBillWave, FaTrash } from 'react-icons/fa';
import { useConfig } from "./ConfigProvider";
import { authFetch } from "../utils/authFetch";


const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
const config = useConfig();
var apiUrl="";
  // Fetch customers on load
  useEffect(() => {
    fetchCustomers();
  }, []);

  if(config){
  console.log(config.API_URL);
  apiUrl=config.API_URL;
  }

    const fetchCustomers = () => {
        authFetch(apiUrl + "/api/shop/get/customersList", {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then((data) => setCustomers(data))
            .catch((error) => {
                console.error("Error fetching customers:", error);
                alert("Something went wrong while fetching customers.");
            });
    };


  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = async (e) => {
    e.preventDefault();

    try {
      const payload = { name, email, phone };
      const response = await fetch(apiUrl+"/api/shop/create/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      fetchCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Something went wrong while adding the customer.");
    }
    setIsModalOpen(false);
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      const response = await fetch(
        `${apiUrl}/api/shop/customer/delete/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // Remove from state without refetching
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Something went wrong while deleting the customer.");
    }
  };

  return (
    <div className="page-container">
      <h2>Customers</h2>
      <div className="page-header">
        <input
          type="text"
          placeholder="Search customers..."
          className="search-bar"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn" onClick={() => setIsModalOpen(true)}>Add Customer</button>
      </div>

      <div className="glass-card">
        <div className="customer-grid">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="customer-card">
              <h3>{customer.name}</h3>
              <p className="customer-info">
                <FaEnvelope className="icon" /> {customer.email}
              </p>
              <p className="customer-info spaced">
                <FaPhone className="icon" /> {customer.phone}
              </p>
              <p className="customer-info">
                <FaMoneyBillWave className="icon" /> ₹{customer.totalSpent.toLocaleString()}
              </p>

              {/* Bin button */}
              <button
                className="delete-btn"
                onClick={() => handleDeleteCustomer(customer.id)}
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      </div>

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
            <button type="submit" className="btn">Add Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
