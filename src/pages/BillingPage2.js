import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBilling } from '../context/BillingContext';
import Modal from '../components/Modal';
import { FaPlus, FaTrash, FaSearch, FaPaperPlane, FaPrint } from 'react-icons/fa';
import '../index.css';
import { useConfig } from "./ConfigProvider";
import { getIndianStates } from "../utils/statesUtil";
import { useAlert } from '../context/AlertContext';
import toast, {Toaster} from 'react-hot-toast';

// A simple debounce hook to prevent API calls on every keystroke
const useDebounce = (value, delay) => {

    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const BillingPage = ({ setSelectedPage }) => {
    const { showAlert } = useAlert();
    const {
        selectedCustomer, setSelectedCustomer,
        cart, addProduct, removeProduct,
        paymentMethod, setPaymentMethod,
        clearBill, products, loadProducts,
        updateCartItem
    } = useBilling();

    // --- Component State ---
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [customersList, setCustomersList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [orderRef, setOrderRef] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [availableMethods, setAvailableMethods] = useState([]);
    const [notification, setNotification] = useState(null);
    // --- State for New Customer Modal ---
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [customerState, setCustomerState] = useState("");
    const [shopState, setShopState] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false); // NEW: Controls search results visibility
    const searchContainerRef = useRef(null); // NEW: Ref for the search container
    const lastSearchedTerm = useRef(null);
    // --- State for Product Search ---
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(productSearchTerm, 300); // Debounce search input
    // State for Customer Search Modal
    const [searchTerm, setSearchTerm] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false); // <-- ADD THIS

    const statesList = getIndianStates();
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 500);
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);

    // --- Calculations ---
    const actualSubtotal = cart.reduce((total, item) => total + (item.listPrice || item.price) * item.quantity, 0);
    const sellingSubtotal = cart.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
    const tax = cart.reduce((total, item) => {
        const totalSellingPrice = item.sellingPrice * item.quantity;
        const itemTaxAmount = totalSellingPrice - (totalSellingPrice / (1 + (item.tax / 100)));
        return total + itemTaxAmount;
    }, 0);
    const total = sellingSubtotal - tax;
    const discountPercentage = actualSubtotal > 0 ? (((actualSubtotal - sellingSubtotal) / actualSubtotal) * 100).toFixed(2) : 0;

    // --- NEW: State for Paying Amount ---
    const [payingAmount, setPayingAmount] = useState(sellingSubtotal);
    const remainingAmount = sellingSubtotal - payingAmount;

    // --- NEW: Effect to sync payingAmount with sellingSubtotal ---
    useEffect(() => {
        setPayingAmount(sellingSubtotal);
    }, [sellingSubtotal]);


    // --- API Calls and Data Fetching ---

    // Fetch customers list on initial load
// NEW: Fetch customers dynamically for the search modal
    const fetchCustomersForModal = useCallback(async (searchTerm = '') => {
        if (!apiUrl) return;
        setIsCustomerLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
            // If there's a search term, use it. Otherwise, fetch top 15.
            if (searchTerm) {
                url.searchParams.append('search', searchTerm);

                url.searchParams.append('page', 1);
            } else {
                url.searchParams.append('limit', 15);
                url.searchParams.append('page', 1);
            }

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            // The API returns data in a 'data' property
            setCustomerSearchResults(result.data || []);
        } catch (error) {
            console.error("Error fetching customers for billing:", error);
            setCustomerSearchResults([]);
        } finally {
            setIsCustomerLoading(false);
        }
    }, [apiUrl]);

// NEW: useEffect to trigger the customer fetch when modal is open or search term changes
    useEffect(() => {
        // Only fetch if the modal is open
        if (isModalOpen) {
            fetchCustomersForModal(debouncedCustomerSearchTerm);
        }
    }, [isModalOpen, debouncedCustomerSearchTerm, fetchCustomersForModal]);

    // Fetch available payment methods
    useEffect(() => {
        if (!apiUrl) return;
        fetch(`${apiUrl}/api/shop/availablePaymentMethod`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        })
            .then(res => res.json())
            .then(data => setAvailableMethods(data))
            .catch(err => console.error("Error fetching payment methods:", err));
    }, [apiUrl]);

    // Fetch shop details for tax calculation
    useEffect(() => {
        if (!apiUrl) return;
        const fetchShopDetails = async () => {
            try {
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/null`, {
                    method: "GET",
                    credentials: 'include',
                    headers: { Accept: "application/json" },
                });
                if (detailsRes.ok) {
                    const data = await detailsRes.json();
                    console.log("The shop detail are ", data);
                    setShopState(data?.shopState || '');
                    setCustomerState(data?.shopState || '');
                }
            } catch (err) {
                console.error("Error fetching shop details:", err);
            }
        };
        fetchShopDetails();
    }, [apiUrl]);


    // --- Sanity Check API Call on Page Load ---
    useEffect(() => {
        if (!apiUrl) return;

        const runSanityCheck = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/shop/gstBilling/sanityCheck`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) return;

                const data = await response.json();

                if (data && data.success === false) {
                    // --- This is the new part ---

                    // 1. Define the click handler function
                    const handleLinkClick = (e) => {
                        e.preventDefault(); // Prevent the <a> tag from jumping to '#'
                        setSelectedPage('profile');

                        // Optional: If your notification system has a close function,
                        // you might want to call it here so it disappears on click.
                        // e.g., setNotification(null);
                    };

                    // 2. Create the message with the link included
                    const messageWithLink = (
                        <span>
                        {data.message}{' '}
                            <a
                                href="#"
                                onClick={handleLinkClick}
                                // Adding some inline style to make it look like a link
                                style={{
                                    color: '#007bff', // Or your app's link color
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    marginLeft: '5px'
                                }}
                            >
                            Complete Profile
                        </a>
                    </span>
                    );

                    // 3. Pass the JSX element as the message
                    setNotification({ type: data.type, message: messageWithLink });
                }
            } catch (error) {
                console.error("Sanity check API failed:", error);
            }
        };

        runSanityCheck();
    }, [apiUrl, setSelectedPage]);// Runs once when the component mounts and apiUrl is available

// --- Timer to automatically dismiss the notification ---
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null); // Hide notification after 5 seconds
            }, 5000);

            // Cleanup the timer if the component unmounts
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- NEW: Product Search API Call ---
    const fetchProductsFromAPI = useCallback((q = '') => {
        if (!apiUrl || !q) {
            loadProducts([]); // Clear results if search is empty
            return;
        }
        const params = new URLSearchParams({ q, limit: 5 }); // Limit results for dropdown
        fetch(`${apiUrl}/api/shop/get/forGSTBilling/withCache/productsList?${params.toString()}`, {
            method: "GET",
            credentials: 'include',
            headers: { "Content-Type": "application/json" }
        })
            .then(res => res.json())
            .then(data => {
                const items = data?.data || (Array.isArray(data) ? data : []);
                loadProducts(items);
            })
            .catch(err => console.error("Error fetching products:", err));
    }, [apiUrl, loadProducts]);

    // Add this function inside your BillingPage component  const response = await fetch(`${apiUrl}/api/shop/get/invoice/${invoiceNumber}`, {
    // Replace your existing handlePrintInvoice function with this one
    const handlePrintInvoice = async (invoiceNumber) => {
        if (!invoiceNumber) {
            toast.error("Order Reference number is not available.");
            return;
        }
        setShowPopup(false); // <-- ADDED
        setIsPrinting(true);
        try {
            const response = await fetch(`${apiUrl}/api/shop/get/invoice/${invoiceNumber}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch invoice: ${response.statusText}`);
            }

            const blob = await response.blob();

            // Create a URL for the blob
            const pdfUrl = URL.createObjectURL(blob);

            // --- NEW, MORE RELIABLE METHOD ---
            // Open the PDF in a new browser tab
            const printWindow = window.open(pdfUrl, '_blank');

            // Check if the window was opened successfully
            if (printWindow) {
                // A timeout gives the browser's PDF viewer a moment to load
                setTimeout(() => {
                    try {
                        // Trigger the print dialog in the new tab
                        printWindow.print();
                    } catch (error) {
                        console.error("Could not trigger print dialog automatically:", error);
                        showAlert("Your invoice is open in a new tab. You can print it from there.");
                    }
                    // The URL will be automatically revoked by the browser when the new tab is closed.
                }, 500); // 500ms delay
            } else {
                showAlert("Please allow pop-ups for this site to print the invoice automatically.");
            }

        } catch (error) {
            console.error("Error printing invoice:", error);
            showAlert("Could not retrieve the invoice. Please try again.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSendEmail = async (invoiceNumber) => {
        if (!invoiceNumber) {
            showAlert("Order Reference number is not available.", "error");
            return;
        }

        setIsSendingEmail(true);
        try {
            // I'm assuming a POST request to an endpoint like this.
            // Adjust the URL and method (GET/POST) as needed.
            const response = await fetch(`${apiUrl}/api/shop/send-invoice-email/${invoiceNumber}`, {
                method: 'POST', // or 'GET' if that's how you set it up
                credentials: 'include',
            });

            if (!response.ok) {
                // Try to get a meaningful error message from the backend
                const errorData = await response.text();
                throw new Error(errorData || `Failed to send invoice: ${response.statusText}`);
            }

            // If successful
            toast.success("Invoice sent successfully!", "success");
            setShowPopup(false);

        } catch (error) {
            console.error("Error sending invoice email:", error);
            showAlert(`Could not send invoice: ${error.message}`, "error");
        } finally {
            setIsSendingEmail(false);
        }
    };


    // Place this with your other calculation constants
    const groupedTaxes = useMemo(() => {
        // Return empty object if we can't determine tax type
        if (!selectedCustomer || !shopState || cart.length === 0) {
            return {};
        }

        console.log("selected customer details",selectedCustomer );

        const taxSummary = {};

        cart.forEach(item => {
            const taxRate = item.tax / 100;
            const basePrice = item.sellingPrice / (1 + taxRate);
            const totalTaxAmount = (item.sellingPrice - basePrice) * item.quantity;

            // Same state logic
            if (selectedCustomer.state === shopState) {
                const halfTax = totalTaxAmount / 2;
                const halfPercent = item.tax / 2;
                const cgstKey = `CGST @${halfPercent}%`;
                const sgstKey = `SGST @${halfPercent}%`;
                // Add to existing value or initialize
                taxSummary[cgstKey] = (taxSummary[cgstKey] || 0) + halfTax;
                taxSummary[sgstKey] = (taxSummary[sgstKey] || 0) + halfTax;
            } else { // Different state logic
                const igstKey = `IGST @${item.tax}%`;
                taxSummary[igstKey] = (taxSummary[igstKey] || 0) + totalTaxAmount;
            }
        });

        return taxSummary;
    }, [cart, selectedCustomer, shopState]);

    // Effect to trigger search when debounced term changes
    useEffect(() => {
        // Prevent re-fetching if the search term hasn't actually changed
        if (debouncedSearchTerm === lastSearchedTerm.current) {
            return;
        }

        if (debouncedSearchTerm) {
            lastSearchedTerm.current = debouncedSearchTerm; // Mark this term as "searched"
            fetchProductsFromAPI(debouncedSearchTerm);
        } else {
            loadProducts([]);
            lastSearchedTerm.current = null; // Reset if search is cleared
        }
    }, [debouncedSearchTerm, fetchProductsFromAPI, loadProducts])

    // --- Event Handlers ---

    // NEW: Handle adding a product with a stock check
    // Replace your existing handleAddProduct function
    // Replace your existing handleAddProduct function with this version

    const handleAddProduct = (p) => {
        addProduct({
            ...p,
            listPrice: p.price, // This is the original price from the backend
            sellingPrice: p.price, // Initially, selling price is the same
            costPrice: p.costPrice,
            discountPercentage: '' // Default discount is 0
        });
    };

    const handleDiscountChange = (itemId, percentage) => {
        const item = cart.find(i => i.id === itemId);
        if (!item) return;

        // If the input is empty, treat the discount as 0 for calculation.
        if (percentage === '') {
            updateCartItem(itemId, { discountPercentage: '', sellingPrice: item.listPrice });
            return;
        }

        const discount = parseFloat(percentage);

        // If the input isn't a valid number or is out of range,
        // just update the input's text without breaking the calculations.
        if (isNaN(discount) || discount < 0 || discount > 100) {
            updateCartItem(itemId, { discountPercentage: percentage }); // Update only the display value
            return;
        }

        const newSellingPrice = item.listPrice * (1 - discount / 100);
        updateCartItem(itemId, { discountPercentage: discount, sellingPrice: newSellingPrice });
    };
    const handleDecrementQty = (item) => {
        if (item.quantity <= 1) {
            return; // Don't allow quantity to go below 1
        }
        updateCartItem(item.id, { quantity: item.quantity - 1 });
    };

    // --- MODIFICATION 3 ---
    // Add this new handler to increment quantity with a stock check.
    const handleIncrementQty = (item) => {
        if (item.quantity >= item.stock) {
            showAlert('Cannot add more than available stock.');
            return;
        }
        updateCartItem(item.id, { quantity: item.quantity + 1 });
    };





    // NEW: Handle changing the selling price directly in the cart
    const handleSellingPriceChange = (itemId, newPrice) => {
        const price = parseFloat(newPrice);
        updateCartItem(itemId, { sellingPrice: isNaN(price) ? 0 : price });
    };

    // --- NEW: useEffect to handle clicks outside the search component ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsSearchFocused(false); // Close results if click is outside
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchContainerRef]);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const payload = { name, email, phone, city, customerState, gstNumber };
        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }
            const newCustomer = await response.json();
            setCustomersList(prevList => [...prevList, newCustomer]);
            setSelectedCustomer(newCustomer);
            setName("");
            setEmail("");
            setPhone("");
            setIsNewCusModalOpen(false);
        } catch (error) {
            console.error("❌ Error adding customer:", error);
            showAlert(`Failed to add customer. Please check the console for details.`);
        }
    };

    const handleNewBilling = () => {
        clearBill();
        setProductSearchTerm("");
    };

    const handlePreview = () => {
        if (!selectedCustomer || cart.length === 0) {
            showAlert('Please select a customer and add products.');
            return;
        }
        setIsPreviewModalOpen(true);
    };

    // --- Payment Processing ---
    const processPayment = async (paymentProviderPayload = {}) => {
        if (!selectedCustomer || cart.length === 0) {
            showAlert('Please select a customer and add products.');
            return;
        }
        setLoading(true);

        // --- FIX: Create a new cart object for the backend with the final calculated price ---
        const cartForBackend = cart.map(item => {
            // --- FIX: Default null discountPercentage to 0 ---
            const discountPercentage = item.discountPercentage || 0;

            // Calculate the final price per unit based on the corrected percentage
            const listPrice = item.price; // The original price
            const discountAmount = listPrice * (discountPercentage / 100);
            const finalPricePerUnit = listPrice - discountAmount;

            // Return a new object for the payload
            return {
                ...item,
                sellingPrice: finalPricePerUnit, // Overwrite sellingPrice with the final calculated price
                discountPercentage: discountPercentage, // Ensure the backend receives 0 instead of null
            };
        });

        // --- MODIFICATION 2: Add payingAmount and remainingAmount to payload ---
        const payload = {
            selectedCustomer,
            cart: cartForBackend, // <-- Use the newly created cart object
            sellingSubtotal,
            discountPercentage,
            tax,
            paymentMethod,
            remarks,
            payingAmount: payingAmount, // <-- ADDED
            remainingAmount: remainingAmount, // <-- ADDED
            ...paymentProviderPayload // Include Razorpay IDs if any
        };

        const endpoint = paymentMethod === 'CARD' ? '/api/razoray/verify-payment' : '/api/shop/do/billing';
        const body = paymentMethod === 'CARD' ? JSON.stringify({ billingDetails: payload, ...paymentProviderPayload }) : JSON.stringify(payload);

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body,
            });
            const data = await res.json();

            // --- START: NEW AUTOPRINT LOGIC ---

            // 1. Get the invoice number from the response
            const newInvoiceNumber = data.invoiceNumber || 'N/A';
            setOrderRef(newInvoiceNumber); // Set state for the popup

            // 2. Get the auto-print setting from localStorage
            // We check against 'true' because localStorage stores strings
            const autoPrint = localStorage.getItem('autoPrintInvoice') === 'true';

            // 3. If auto-print is on and we have a valid invoice number, call print
            if (autoPrint && newInvoiceNumber !== 'N/A') {
                handlePrintInvoice(newInvoiceNumber);
            }

            // --- END: NEW AUTOPRINT LOGIC ---


            setPaidAmount(data.totalAmount || sellingSubtotal); // You might want to change this to data.payingAmount if backend returns it
            setShowPopup(true);
            handleNewBilling();
        } catch (err) {
            console.error("Billing failed:", err);
            showAlert("Billing failed.");
        } finally {
            setLoading(false);
            setIsPreviewModalOpen(false);
        }
    };

    const HandleCardProcessPayment = async () => {
        setLoading(true);
        // --- Use payingAmount for Razorpay, not sellingSubtotal ---
        const amountToPay = payingAmount > 0 ? payingAmount : sellingSubtotal;

        const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amountToPay * 100, currency: "INR" }), // Use amountToPay
        });

        if (!orderResponse.ok) {
            showAlert("Server error. Could not create Razorpay order.");
            setLoading(false);
            return;
        }
        const orderData = await orderResponse.json();

        const options = {
            key: "rzp_test_RM94Bh3gUaJSjZ", // Replace with your key
            order_id: orderData.id,
            name: "Your Shop Name",
            description: "Billing Transaction",
            handler: (response) => {
                processPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                });
            },
            prefill: {
                name: selectedCustomer?.name,
                email: selectedCustomer?.email,
                contact: selectedCustomer?.phone,
            },
            theme: { color: "#3399cc" },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
            showAlert(`Payment Failed: ${response.error.description}`);
            setLoading(false);
        });
        rzp.open();
    };

    const handleProcessPayment = () => {
        if (paymentMethod === "CARD") {
            HandleCardProcessPayment();
        } else {
            processPayment();
        }
    };

    // --- Render ---
    return (
        <div className="billing-page">

            {notification && (
                <div style={{
                    padding: '1rem',
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 500,
                    position: 'sticky',
                    top: 0,
                    width: '80%',
                    zIndex: 1050,
                    borderRadius: '20px',
                    // Background color changes based on notification type
                    backgroundColor: notification.type === 'error' ? '#d9534f' : '#f0ad4e',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                }}>
                    <strong>{notification.type.toUpperCase()}: </strong>
                    {notification.message}
                </div>
            )}

            <Toaster position="top-center" toastOptions={{
                duration: 2000,
                style: {
                    background: 'lightgreen',
                    color: 'var(--text-color)',
                    borderRadius: '25px',
                    padding: '12px',
                    width: '100%',
                    fontSize: '16px',
                },
            }}   reverseOrder={false} />
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Billing</h2>
            </div>




            {/* --- Layout: Main Content (Left) and Summary (Right) --- */}
            <div className="billing-layout-new" style={{ display: 'flex', gap: '20px' }}>

                {/* --- 2. Main Content Area (3/4 width) --- */}
                <div className="current-bill-section" style={{ flex: 4 }}>
                    <div className="glass-card" style={{ padding: '1rem' }}>

                        {/* --- NEW HEADER with Buttons Moved to the Right --- */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Current Bill</h3>
                            <div className="customer-actions" style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn" onClick={() => setIsModalOpen(true)}><i
                                    className="fa-duotone fa-solid fa-user-magnifying-glass" style={{paddingRight:"5px"}}></i>
                                    {selectedCustomer ? `Change Customer` : 'Select Customer'}
                                </button>
                                <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>
                                    <i className="fa-duotone fa-solid fa-user-plus"></i> Create Customer
                                </button>
                                {cart.length > 0 && (
                                    <button className="btn btn-danger" onClick={handleNewBilling}>
                                        New Bill
                                    </button>
                                )}
                            </div>
                        </div>

                        {selectedCustomer && (
                            <p style={{ fontSize: '1.1em', textDecoration: 'underline' }}>
                                Customer: <strong>{selectedCustomer.name}</strong>{' '}
                                <strong style={{ fontSize: '0.8em', color: '#888', marginLeft: '10px' }}>{selectedCustomer.phone}</strong>
                            </p>
                        )}

                        {/* --- MOVED & UPDATED Product Search Component --- */}
                        <div className="product-search-container" ref={searchContainerRef} style={{ marginTop: '1rem', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.2rem 1rem' }}>
                                <FaSearch style={{ color: 'var(--text-color)' }} />
                                <input
                                    type="text"
                                    placeholder="Search for products to add..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)} // Show results on focus
                                    style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-color)', fontSize: '1rem', outline: 'none' }}
                                />
                            </div>
                            {/* Search Results Dropdown - now closes on blur */}
                            {isSearchFocused && debouncedSearchTerm && (
                                <div className="search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {products.length > 0 ? products.map(p => (
                                        <div
                                            key={p.id}
                                            className="search-result-item" // <-- ADD THIS CLASSNAME
                                            onClick={() => handleAddProduct(p)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                borderBottom: '1px solid var(--border-color-light)',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s ease' // Optional: Adds a smooth transition
                                            }}
                                        >
                                            <div>
                                                <strong>{p.name}</strong>
                                                <div style={{ fontSize: '0.8em', color: '#888' }}>
                                                    Price: ₹{p.price} | Tax: {p.tax}% | Stock: {p.stock}
                                                </div>
                                            </div>
                                            {/* <button className="btn small-btn" onClick={() => handleAddProduct(p)}>
                                                <FaPlus /> Add
                                            </button>*/}
                                        </div>
                                    )) : <div style={{padding: '1rem', textAlign: 'center', color: '#888'}}>No products found.</div>}
                                </div>
                            )}
                        </div>

                        {/* --- Cart Table (now inside the main card) --- */}
                        <div className="cart-items" style={{ marginTop: '1rem' }}>
                            {cart.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#888' }}>No items in cart. Use the search bar above to add products.</p>
                            ) : (
                                <div className="cart-table-wrapper">
                                    <table className="beautiful-table cart-table">
                                        <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>HSN</th>
                                            <th>List Price </th>
                                            <th>Qty</th>
                                            <th>Discount%</th>
                                            <th>Base Price </th>
                                            <th>Tax </th>
                                            <th>Selling </th>
                                            <th>Details</th>
                                            <th>Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {cart.map(item => {
                                            const taxRate = item.tax / 100;
                                            const basePrice = item.sellingPrice / (1 + taxRate);
                                            const totalTaxAmount = (item.sellingPrice - basePrice) * item.quantity;
                                            const totalBasePrice = basePrice * item.quantity;
                                            const totalSellingPrice = item.sellingPrice * item.quantity;
                                            const totalListPrice = (item.listPrice || item.price);

                                            // --- MODIFICATION: Define the conditional style for the selling price cell ---
                                            const sellingPriceCellStyle = {
                                                verticalAlign: 'middle',
                                                transition: 'background-color 0.3s ease' // Optional: for a smooth color change
                                            };

                                            // If the selling price per item is less than its cost, add a faint red background.
                                            if (item.sellingPrice < item.costPrice) {
                                                sellingPriceCellStyle.backgroundColor = '#e8a2ad'; // A faint red color
                                            }

                                            return (
                                                <tr key={item.id}>
                                                    <td style={{ verticalAlign: 'middle' }}>{item.name}</td>
                                                    <td style={{ verticalAlign: 'middle' }}>{item.hsn}</td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        {totalListPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        <div className="qty-control">
                                                            <span>{item.quantity}</span>
                                                            <div className="qty-arrows">
                                                                <button onClick={() => handleIncrementQty(item)} className="qty-arrow-btn">▲</button>
                                                                <button onClick={() => handleDecrementQty(item)} className="qty-arrow-btn">▼</button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle', width: '90px' }}>
                                                        <input
                                                            type="text"
                                                            value={item.discountPercentage}
                                                            onChange={(e) => handleDiscountChange(item.id, e.target.value)}
                                                            placeholder="0"
                                                            style={{ width: '100%', padding: '5px', textAlign: 'center', borderRadius: '8px', color: 'var(--text-color)', border: '1px solid var(--border-color)', backgroundColor: 'var(--glass-card)' }}
                                                        />
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        {totalBasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        <span>{totalTaxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        {(() => {
                                                            const labelStyle = { fontSize: '0.8em', color: "var(--tiny-text-color)", fontStyle: "italic", display: 'block', marginTop: '2px', marginLeft: '10px' };
                                                            if (selectedCustomer && shopState) {
                                                                if (selectedCustomer.state === shopState) {
                                                                    const halfTax = totalTaxAmount / 2;
                                                                    const halfPercent = item.tax / 2;
                                                                    return (<>
                                                                        <span style={labelStyle}>CGST@{halfPercent}%: {halfTax.toFixed(2)}</span>
                                                                        <span style={labelStyle}>SGST@{halfPercent}%: {halfTax.toFixed(2)}</span>
                                                                    </>);
                                                                } else {
                                                                    return <span style={labelStyle}>IGST@{item.tax}%: {totalTaxAmount.toFixed(2)}</span>;
                                                                }
                                                            }
                                                        })()}
                                                    </td>

                                                    {/* --- MODIFICATION: The style object is applied here --- */}
                                                    <td style={sellingPriceCellStyle}>
                                                        {totalSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>

                                                    <td style={{ verticalAlign: 'middle' }}>
                    <textarea
                        value={item.details || ''}
                        onChange={(e) => updateCartItem(item.id, { details: e.target.value })}
                        placeholder="Add details..."
                        style={{ width: '100%', minHeight: '40px', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-color)',  backgroundColor: 'var(--glass-card)' }}
                    />
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        <button className="remove-btn" onClick={() => removeProduct(item.id)}>
                                                            <FaTrash />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- 3. Summary Section (1/4 width) --- */}
                <div className="summary-section glass-card" style={{ flex: 1, padding: '1rem', height: 'fit-content' }}>
                    <h3 style={{ textAlign: 'center', marginTop: 0 }}>Summary</h3>
                    <div className="invoice-summary">
                        <p>Total without GST: <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <p className="tax">GST: <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        {/* --- ADD THIS NEW DIV FOR THE TAX BREAKDOWN --- */}
                        <div className="tax-breakdown" style={{ fontSize: '0.85em', color: '#666', borderLeft: '2px solid var(--border-color)', paddingLeft: '10px', marginLeft: '5px' }}>
                            {Object.entries(groupedTaxes).map(([key, value]) => (
                                <p key={key} style={{ margin: '2px 0', color: "var(--tiny-text-color)", display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{key}:</span>
                                    <span>₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </p>
                            ))}
                        </div>
                        <p className="discount">Discount: <span>{discountPercentage}%</span></p>
                        <h4 className="subtotal-selling">Final Total: <span>₹{sellingSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h4>

                        {/* --- MODIFICATION 1: Add Paying and Remaining Fields --- */}
                        {/* I've changed the className from "form-group" to "payment-input-group"
    to avoid conflicts. I also corrected alignItems and adjusted the input width. */}
                        <div className="payment-input-group" style={{
                            display: 'flex',
                            alignItems: 'center', // <-- Corrected from 'left'
                            justifyContent: 'space-between',
                            margin: '1rem 0 0.5rem 0',
                            gap: '10px' // <-- Added a bit more gap
                        }}>
                            <label style={{ fontWeight: 500, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>
                                Paying:
                            </label>
                            <input
                                type="number"
                                value={payingAmount}
                                onChange={(e) => setPayingAmount(parseFloat(e.target.value) || 0)}
                                style={{
                                    width: '40%', // <-- This will fill the remaining space
                                    padding: '10px',
                                    borderRadius: '15px', // <-- Matched your other inputs
                                    border: '3px solid var(--border-color)',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-color)',
                                    fontSize: '1rem',
                                    textAlign: 'right'
                                }}
                            />
                        </div>
                        <h5 className="remaining-total" style={{ margin: '0 0 1rem 0', textAlign: 'right', color: 'var(--primary-color)' }}>
                            Due: <span>₹{remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </h5>
                        {/* --- End of MODIFICATION 1 --- */}


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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { type: 'CASH', color: '#00aaff', icon: '💵', key: 'cash' },
                                    { type: 'CARD', color: '#0077cc', icon: '💳', key: 'card' },
                                    { type: 'UPI', color: '#3399ff', icon: '📱', key: 'upi' }
                                ].map(method => {
                                    const enabled = availableMethods?.[method.key];

                                    return (
                                        <label
                                            key={method.type}
                                            title={!enabled ? 'Contact support to enable this payment method' : ''}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start', // Align items to the start
                                                gap: '8px',
                                                width: '370px',
                                                padding: '0.45rem 0.75rem',
                                                borderRadius: '20px',
                                                border: `1px solid ${
                                                    enabled
                                                        ? paymentMethod === method.type
                                                            ? 'var(--primary-color)'
                                                            : 'var(--border-color)'
                                                        : '#ccc'
                                                }`,
                                                background: enabled
                                                    ? paymentMethod === method.type
                                                        ? 'var(--primary-color-light)'
                                                        : 'transparent'
                                                    : '#f5f5f5',
                                                cursor: enabled ? 'pointer' : 'not-allowed',
                                                transition: 'all 0.15s ease',
                                                fontWeight: '600',
                                                color: enabled ? 'var(--text-color)' : '#888',
                                                fontSize: '0.95rem',
                                                opacity: enabled ? 1 : 0.6
                                            }}
                                        >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: method.color,
                            color: 'white',
                            fontSize: '0.85rem'
                        }}
                    >
                                  {method.icon}
                                </span>
                                            <input
                                                type="radio"
                                                value={method.type}
                                                checked={paymentMethod === method.type}
                                                onChange={e => enabled && setPaymentMethod(e.target.value)}
                                                disabled={!enabled}
                                                style={{ accentColor: 'var(--primary-color)' }}
                                            />
                                            <span style={{ marginLeft: '4px' }}>{method.type}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            className="process-payment-btn"
                            onClick={handleProcessPayment}
                            disabled={loading || cart.length === 0}
                        >
                            {loading ? 'Processing...' : 'Process Payment'}
                        </button>
                        <button className="btn" onClick={handlePreview} disabled={cart.length === 0}>
                            Preview
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                />
                <ul className="customer-modal-list">
                    {isCustomerLoading ? (
                        <li style={{ textAlign: 'center' }}>Loading...</li>
                    ) : customerSearchResults.length > 0 ? (
                        customerSearchResults.map(c => (
                            <li
                                key={c.id}
                                onClick={() => {
                                    setSelectedCustomer(c);
                                    setIsModalOpen(false);
                                    setCustomerSearchTerm(''); // Reset search after selection
                                }}
                            >
                                <span>{c.name}</span>
                                <span>{c.state}</span>
                                <span style={{ color: '#555', fontSize: '0.9em' }}>{c.phone}</span>
                            </li>
                        ))
                    ) : (
                        <li>No customers found. Try searching for another name or number.</li>
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
                        <input type="email"  value={email} onChange={(e) => setEmail(e.target.value)} />
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
                        <label>GST Number</label>
                        <input type="text"  value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
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
                        <input type="tel" required value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add & Select Customer</button>
                    </div>

                </form>
            </Modal>
            <Modal title="Order Summary" show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)}>
                <div className="order-summary" style={{ padding: '10px' }}>
                    <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Customer Details</h3>
                        <p><strong>Name:</strong> {selectedCustomer?.name}</p>
                        <p><strong>Phone:</strong> {selectedCustomer?.phone}</p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Order Items</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Item</th>
                                <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Price</th>
                            </tr>
                            </thead>
                            <tbody>
                            {cart.map(item => (
                                <tr key={item.id}>
                                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{item.name}</td>
                                    <td style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                        ₹{((item.sellingPrice || item.price) * item.quantity).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span>Total without GST:</span>
                            <strong>₹{total.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span>GST:</span>
                            <strong>₹{tax.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span>Discount:</span>
                            <strong>{discountPercentage}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.2em', color: 'var(--primary-color)' }}>
                            <strong>Final Total:</strong>
                            <strong>₹{sellingSubtotal.toLocaleString()}</strong>
                        </div>

                        {/* --- I've also added the Paying/Remaining to the preview modal --- */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1em', paddingTop: '10px', borderTop: '1px solid var(--border-color-light)' }}>
                            <strong>Paying:</strong>
                            <strong>₹{payingAmount.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1em' }}>
                            <strong>Remaining:</strong>
                            <strong>₹{remainingAmount.toLocaleString()}</strong>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <strong>Payment Method:</strong> {paymentMethod}
                        </div>
                        {remarks && (
                            <div style={{ marginTop: '15px' }}>
                                <strong>Remarks:</strong>
                                <p style={{ marginTop: '5px', padding: '10px', background: 'var(--glass-bg)', borderRadius: '8px' }}>
                                    {remarks}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <button
                    className="btn process-payment-btn"
                    onClick={handleProcessPayment}
                    disabled={loading}
                    style={{ position: "relative", padding: "0.75rem 2rem" }}
                >
                    Process Payment
                </button>

            </Modal>

            {loading && (
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
                    >
                        <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
                            Processing Payment...
                        </h2>

                        {/* Spinner */}
                        <div
                            style={{
                                width: "50px",
                                height: "50px",
                                border: "6px solid var(--border-color)",
                                borderTop: "6px solid var(--primary-color)",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                                margin: "0 auto"
                            }}
                            className="spinner"
                        ></div>

                        {/* Spinner Animation */}
                        <style>
                            {`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                
                                    .spinner {
                                        animation: spin 1s linear infinite;
                                    }
                                    `}
                        </style>

                        <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Please wait while we complete your payment.</p>
                    </div>
                </div>
            )}

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
                >
                    <div
                        style={{
                            background: 'var(--glass-bg)',
                            padding: '2rem',
                            borderRadius: '25px',
                            width: '90%',
                            maxWidth: '600px',
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
                            {/* This now shows the amount that was actually paid */}
                            Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong>
                        </p>

                        {/* This will show the remaining balance if any */}
                        {remainingAmount > 0 && (
                            <p style={{ fontSize: '1.1rem', margin: '0.5rem 0', color: '#d9534f' }}>
                                Amount Remaining: <strong>₹{remainingAmount.toLocaleString()}</strong>
                            </p>
                        )}


                        {/* --- NEW Button Container --- */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '0.75rem',  // <-- Adjusted gap
                            marginTop: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '25px',
                                    border: '1px solid var(--border-color)',
                                    background: 'transparent',
                                    color: 'var(--text-color)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setShowPopup(false)}
                            >
                                Close
                            </button>

                            {/* --- UPDATED: Email Button --- */}
                            {localStorage.getItem('autoSendInvoice') !== 'true' && (
                                <button
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '25px',
                                        border: '1px solid var(--primary-color)',
                                        background: 'transparent',
                                        color: 'var(--primary-color)',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        opacity: isSendingEmail ? 0.7 : 1,
                                        // --- Add flex properties for icon ---
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onClick={() => handleSendEmail(orderRef)}
                                    disabled={isSendingEmail}
                                >
                                    <FaPaperPlane
                                        size={20} />
                                    {isSendingEmail ? 'Sending...' : 'Send to Email'}
                                </button>
                            )}
                            <button
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '25px',
                                    border: 'none',
                                    backgroundColor: 'var(--primary-color)',
                                    color: 'white',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: isPrinting ? 0.7 : 1,
                                    // --- Add flex properties for icon ---
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onClick={() => handlePrintInvoice(orderRef)}
                                disabled={isPrinting}
                            >
                                <FaPrint size={20} />
                                {isPrinting ? 'Loading...' : 'Print Invoice'}
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPage;