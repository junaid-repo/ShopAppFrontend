// src/pages/CustomersPage.js
import React, { useState, useEffect } from 'react';
import { mockCustomers } from '../mockData';
import Modal from '../components/Modal';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
      const [name, setName] = useState("");
      const [email, setEmail] = useState("");
      const [phone, setPhone] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);


useEffect(() => {
  fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/customersList", {
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
      setCustomers(data);
    })
    .catch((error) => {
      console.error("Error fetching customers:", error);
      alert("Something went wrong while fetching customers.");
    });
}, []);


    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        console.log(e);
        // API CALL: Add new customer
        // POST /api/customers
        // Payload: { name, email, phone }
        // Response: { success: true, customer: { ... } }

try {
         const payload = {name, email, phone };
            console.log("Payload:", payload);
            const response = await fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/create/customer", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),

            });
            //console.log(body);


            const data = await response.json();
            console.log("API response:", data);
            if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`);
                        }

            } catch (error) {
                console.error("Error adding customer:", error);
                alert("Something went wrong while adding the customer.");
              }

        alert('New customer added! (Demo)');
        setIsModalOpen(false);
    }

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
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Total Spent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id}>
                                <td>{customer.id}</td>
                                <td>{customer.name}</td>
                                <td>{customer.email}</td>
                                <td>{customer.phone}</td>
                                <td>₹{customer.totalSpent.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title="Add New Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel"
                         required
                         value={phone}
                         onChange={(e) => setPhone(e.target.value)}
                         />
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