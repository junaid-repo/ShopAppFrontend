// src/pages/ProductsPage.js
import React, { useState, useEffect } from 'react';
import { mockProducts } from '../mockData';
import Modal from '../components/Modal';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Added for file upload
    // File selection/validation
    const handleCsvChange = (e) => {
      const file = e.target.files?.[0] || null;
      setUploadError(null);

      if (!file) {
        setCsvFile(null);
        return;
      }

      // Basic validation
      const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
      if (!isCsv) {
        setUploadError('Please select a .csv file.');
        setCsvFile(null);
        return;
      }

      const maxBytes = 5 * 1024 * 1024; // 5MB example
      if (file.size > maxBytes) {
        setUploadError('File must be 5 MB or less.');
        setCsvFile(null);
        return;
      }

      setCsvFile(file);
    };

    // Form submit -> call the upload method
    const handleCsvSubmit = async (e) => {
      e.preventDefault();
      if (!csvFile) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        await uploadProductsCsv(csvFile);
        setIsCsvModalOpen(false);
        setCsvFile(null);
        // Optionally refresh your products list here
        // await fetchProducts();
      } catch (err) {
        setUploadError(err?.message || 'Upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
    };

    async function uploadProductsCsv(file) {
      const formData = new FormData();
      // The field name "file" should match what your backend expects
      formData.append('file', file);

      const res = await fetch('http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/bulk-upload', {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type for FormData; the browser will set the boundary.
        // headers: { Authorization: `Bearer ${token}` }, // if needed
        // credentials: 'include', // if your API needs cookies
      });

      if (!res.ok) {
        // Try to surface a meaningful error
        let message = `Upload failed (${res.status})`;
        try {
          const error = await res.json();
          if (error?.message) message = error.message;
        } catch {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      return res.json();
    }


useEffect(() => {
  fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/get/productsList", {
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
      setProducts(data);
    })
    .catch((error) => {
      console.error("Error fetching customers:", error);
      alert("Something went wrong while fetching customers.");
    });
}, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (product) => {
      setSelectedProductId(product.id);
      setName(product.name);
      setCategory(product.category);
      setPrice(product.price);
      setStock(product.stock);
      setTax(product.tax);
      setIsUpdateModalOpen(true);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        // API CALL: Add new product
        // POST /api/products
        // Payload: { name, category, price, stock }
        // Response: { success: true, product: { ... } }

        try {
                 const payload = {name, category, price, stock, tax };
                    console.log("Payload:", payload);
                    const response = await fetch("http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/create/product", {
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


        alert('New product added! (Demo)');
        setIsModalOpen(false);
    }

    const handleUpdateProduct = (e) => {
      e.preventDefault();

      const payload = {selectedProductId, name, category, price, stock, tax };
      console.log(payload);

      fetch(`http://shopmanagement-env.eba-gmzcxvrp.eu-north-1.elasticbeanstalk.com/api/shop/update/product`, {
        method: "PUT", // or "PATCH"
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log("Product updated:", data);
          // Refresh product list or update state here
          setIsUpdateModalOpen(false);
        })
        .catch((err) => {
          console.error("Error updating product:", err);
          alert("Failed to update product");
        });
    };


    return (
        <div className="page-container">
            <h2>Products</h2>
            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search products..."
                    className="search-bar"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn" onClick={() => setIsModalOpen(true)}>Add Products</button>
                <button className="btn" onClick={() => setIsCsvModalOpen(true)}>Upload Multiple</button>
            </div>
            <div className="glass-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Tax Percent</th>
                            <th>Stock</th>

                            <th>Status</th>
                            <th>Update</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td>{product.id}</td>
                                <td>{product.name}</td>
                                <td>{product.category}</td>
                                <td>₹{product.price.toLocaleString()}</td>
                                <td>{product.tax}</td>
                                <td>{product.stock}</td>
                                <td><span className={product.stock >0 ? 'status-instock' : 'status-outofstock'}>{product.status}</span></td>
                                <td>
                                    <button type="submit" className="btn" onClick={() => handleEditClick(product)}>Edit</button>
                                    <button type="submit" className="btn" onClick={() => alert(`Deleting product ${product.id}... (Demo)`)}>Delete</button>
                                 </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <input type="text"
                         required
                         value={category}
                         onChange={(e) => setCategory(e.target.value)}
                         />
                    </div>
                    <div className="form-group">
                        <label>Price</label>
                        <input type="number"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                         />
                    </div>
                     <div className="form-group">
                        <label>Stock Quantity</label>
                        <input type="number"
                        required
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <input type="number"
                        required
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                         <button type="submit" className="btn">Add Product</button>
                    </div>
                </form>
            </Modal>

             <Modal
               title="Update Product"
               show={isUpdateModalOpen}
               onClose={() => setIsUpdateModalOpen(false)}
             >
               <form onSubmit={handleUpdateProduct}>
                 <div className="form-group">
                   <label>Product Name</label>
                   <input
                     type="text"
                     required
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                   />
                 </div>
                 <div className="form-group">
                   <label>Category</label>
                   <input
                     type="text"
                     required
                     value={category}
                     onChange={(e) => setCategory(e.target.value)}
                   />
                 </div>
                 <div className="form-group">
                   <label>Price</label>
                   <input
                     type="number"
                     required
                     value={price}
                     onChange={(e) => setPrice(e.target.value)}
                   />
                 </div>
                 <div className="form-group">
                   <label>Stock Quantity</label>
                   <input
                     type="number"
                     required
                     value={stock}
                     onChange={(e) => setStock(e.target.value)}
                   />
                 </div>
                 <div className="form-group">
                     <label>Tax Percent</label>
                     <input type="number"
                     required
                     value={tax}
                     onChange={(e) => setTax(e.target.value)}
                     />
                 </div>
                 <div className="form-actions">
                   <button type="submit" className="btn">Update Product</button>
                 </div>
               </form>
             </Modal>

             <Modal
               title="Upload Products via CSV"
               show={isCsvModalOpen}
               onClose={() => {
                 setIsCsvModalOpen(false);
                 setCsvFile(null);
                 setUploadError(null);
               }}
             >
               <form onSubmit={handleCsvSubmit}>
                 <div className="form-group">
                   <label>CSV file</label>
                   <input
                     type="file"
                     accept=".csv,text/csv"
                     onChange={handleCsvChange}
                     required
                   />
                   {csvFile && (
                     <small>Selected: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</small>
                   )}
                   {uploadError && (
                     <div className="error">{uploadError}</div>
                   )}
                   <div className="help-text">
                     Expected columns: name, category, price, stock, tax (header row recommended).
                   </div>
                 </div>

                 <div className="form-actions">
                   <button
                     type="button"
                     className="btn btn-link"
                     onClick={() => {
                       setIsCsvModalOpen(false);
                       setCsvFile(null);
                       setUploadError(null);
                     }}
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     className="btn"
                     disabled={!csvFile || isUploading}
                   >
                     {isUploading ? 'Uploading…' : 'Upload'}
                   </button>
                 </div>
               </form>
             </Modal>




        </div>
    );
};

export default ProductsPage;