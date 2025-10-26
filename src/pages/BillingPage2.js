import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBilling } from '../context/BillingContext';
import Modal from '../components/Modal';
import { FaPlus, FaTrash, FaSearch, FaPaperPlane, FaPrint } from 'react-icons/fa';
import '../index.css';
import { useConfig } from "./ConfigProvider";
import { getIndianStates } from "../utils/statesUtil";
import { useAlert } from '../context/AlertContext';
import toast, {Toaster} from 'react-hot-toast';
import useHotkeys from '../hooks/useHotkeys'; // Adjust the path if needed
import { FaChevronDown, FaTimes } from 'react-icons/fa'; // Import new icons

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
        updateCartItem,
        payingAmount,
        setPayingAmount,
        isPayingAmountManuallySet,
        setIsPayingAmountManuallySet
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
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchContainerRef = useRef(null);
    const lastSearchedTerm = useRef(null);
    // --- State for Product Search ---
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(productSearchTerm, 300);
    // State for Customer Search Modal
    const [searchTerm, setSearchTerm] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [showPartialBilling, setShowPartialBilling] = useState(false);
    const [showRemarks, setShowRemarks] = useState(false);

    const statesList = getIndianStates();
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 500);
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);
    const [isShortcutListVisible, setIsShortcutListVisible] = useState(false); // <-- ADD THIS

    // --- NEW: Refs for Hotkeys ---
    const productSearchInputRef = useRef(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const discountInputRef = useRef(null); // Ref for the first discount input
    const remarksRef = useRef(null);
    const paymentMethodRef = useRef(null); // Ref for the payment method container
    const customerListRef = useRef(null);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1); // <-- ADD THIS
    const handleCloseSearchModal = useCallback(() => {
        setIsModalOpen(false);
        setHighlightedCustomerIndex(-1);
    }, []); // Empty array means this function is created once

    const handleCloseNewCustomerModal = useCallback(() => {
        setIsNewCusModalOpen(false);
    }, []); // Empty array means this function is created once

    const handleClosePreviewModal = useCallback(() => {
        setIsPreviewModalOpen(false);
    }, []); // Empty array means this function is created once

    const shortcuts = [
        { keys: ['F2'], description: 'Focus Product Search' },
        { keys: ['Esc'], description: 'Close Product Search / Modals' },
        { keys: ['Alt', 'E'], description: 'Open Search Customer Modal' },
        { keys: ['Shift', 'Alt', 'E'], description: 'Open New Customer Modal' }, // Updated based on your code
        { keys: ['Ctrl', 'Alt', 'N'], description: 'Start New Bill' },
        { keys: ['Ctrl', 'Alt', 'D'], description: 'Focus First Discount Input' },
        { keys: ['Alt', 'P'], description: 'Focus Paying Input' }, // Updated based on your code
        { keys: ['Alt', 'M'], description: 'Focus Payment Methods' }, // Updated based on your code
        { keys: ['Ctrl', 'Alt', 'P'], description: 'Open Preview Modal' },
        { keys: ['Alt', 'Enter'], description: 'Process Payment' },
        { keys: ['↑', '↓'], description: 'Navigate Search Lists' },
        { keys: ['Enter'], description: 'Select Item in Search List' },
    ];

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
    const remainingAmount = sellingSubtotal - payingAmount;

    // Effect to sync payingAmount with sellingSubtotal
    useEffect(() => {
        if (!isPayingAmountManuallySet) {
            setPayingAmount(sellingSubtotal);
        }
    }, [sellingSubtotal, isPayingAmountManuallySet, setPayingAmount]);
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

        const cartForBackend = cart.map(item => {
            const discountPercentage = item.discountPercentage || 0;
            const listPrice = item.price;
            const discountAmount = listPrice * (discountPercentage / 100);
            const finalPricePerUnit = listPrice - discountAmount;

            return {
                ...item,
                sellingPrice: finalPricePerUnit,
                discountPercentage: discountPercentage,
            };
        });

        const payload = {
            selectedCustomer,
            cart: cartForBackend,
            sellingSubtotal,
            discountPercentage,
            tax,
            paymentMethod,
            remarks,
            payingAmount: payingAmount,
            remainingAmount: remainingAmount,
            ...paymentProviderPayload
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
            const newInvoiceNumber = data.invoiceNumber || 'N/A';
            setOrderRef(newInvoiceNumber);

            const autoPrint = localStorage.getItem('autoPrintInvoice') === 'true';

            if (autoPrint && newInvoiceNumber !== 'N/A') {
                handlePrintInvoice(newInvoiceNumber);
            }

            setPaidAmount(data.totalAmount || sellingSubtotal);
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

    // --- NEW: Keyboard navigation handler for product search ---
    const handleSearchKeyDown = (e) => {
        // If no products, do nothing
        if (products.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault(); // Prevent cursor from moving in input
            setHighlightedIndex(prevIndex =>
                (prevIndex + 1) % products.length // Wrap around to the start
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault(); // Prevent cursor from moving in input
            setHighlightedIndex(prevIndex =>
                (prevIndex - 1 + products.length) % products.length // Wrap around to the end
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && products[highlightedIndex]) {
                const selectedProduct = products[highlightedIndex]; // Get product
                handleAddProduct(selectedProduct); // Add to cart
                setProductSearchTerm(''); // Clear search term
                // --- UPDATE: Keep focus and ensure dropdown can show ---
                setIsSearchFocused(true);
                productSearchInputRef.current?.focus(); // Keep focus
                setHighlightedIndex(-1); // Reset highlight
            }
        } else if (e.key === 'Escape') {
            e.target.blur();
            setIsSearchFocused(false);
            setHighlightedIndex(-1);
        }
    };


    // --- NEW: All Hotkeys ---


    // --- API Calls and Data Fetching ---
    // ... (your existing fetchCustomersForModal, useEffects, handlePrintInvoice, etc.)
    // ... (no changes needed in this section)
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


    // --- NEW: This function will be called by onClick OR Enter key ---
    const handleCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setIsModalOpen(false);
        setCustomerSearchTerm('');
        setHighlightedCustomerIndex(-1); // Reset highlight
    };

// --- NEW: Handles key presses on the customer search input ---
    const handleCustomerSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedCustomerIndex(0); // Highlight the first item
            customerListRef.current?.focus(); // Focus the list
        }
    };

// --- NEW: Handles key presses on the customer list itself ---
    const handleCustomerListKeyDown = (e) => {
        if (customerSearchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev =>
                (prev + 1) % customerSearchResults.length
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev =>
                (prev - 1 + customerSearchResults.length) % customerSearchResults.length
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedCustomerIndex >= 0) {
                const customer = customerSearchResults[highlightedCustomerIndex];
                handleCustomerSelect(customer);
            }
        }
    };

// NEW: useEffect to trigger the customer fetch when modal is open or search term changes
    useEffect(() => {
        // Only fetch if the modal is open
        if (isModalOpen) {
            fetchCustomersForModal(debouncedCustomerSearchTerm);
            setHighlightedCustomerIndex(-1);
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
        // --- ADDED: Explicit check for apiUrl ---
        if (!apiUrl) return;

        // --- ADDED: Clear results if search query is empty ---
        if (!q) {
            loadProducts([]); // Clear results immediately
            return;
        }

        // --- Existing Fetch Logic ---
        const params = new URLSearchParams({ q, limit: 5 });
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
    }, [apiUrl, loadProducts]); // Dependencies are correct
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
        // Let fetchProductsFromAPI handle both searching and clearing
        fetchProductsFromAPI(debouncedSearchTerm);

        // Always reset the highlight index when the search term changes
        setHighlightedIndex(-1);

        // --- UPDATED: Removed loadProducts from dependencies ---
    }, [debouncedSearchTerm, fetchProductsFromAPI]);

    useEffect(() => {
        const partialBillingSetting = localStorage.getItem('doParitalBilling') === 'true';
        const remarksSetting = localStorage.getItem('showRemarksOptions') === 'true';

        setShowPartialBilling(partialBillingSetting);
        setShowRemarks(remarksSetting);
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Event Handlers ---
    const handleAddProduct = (p) => {
        addProduct({
            ...p,
            listPrice: p.price,
            sellingPrice: p.price,
            costPrice: p.costPrice,
            discountPercentage: ''
        });
    };

    const handleDiscountChange = (itemId, percentage) => {
        const item = cart.find(i => i.id === itemId);
        if (!item) return;

        if (percentage === '') {
            updateCartItem(itemId, { discountPercentage: '', sellingPrice: item.listPrice });
            return;
        }

        const discount = parseFloat(percentage);

        if (isNaN(discount) || discount < 0 || discount > 100) {
            updateCartItem(itemId, { discountPercentage: percentage });
            return;
        }

        const newSellingPrice = item.listPrice * (1 - discount / 100);
        updateCartItem(itemId, { discountPercentage: discount, sellingPrice: newSellingPrice });
    };
    const handleDecrementQty = (item) => {
        if (item.quantity <= 1) {
            return;
        }
        updateCartItem(item.id, { quantity: item.quantity - 1 });
    };

    const handleIncrementQty = (item) => {
        if (item.quantity >= item.stock) {
            showAlert('Cannot add more than available stock.');
            return;
        }
        updateCartItem(item.id, { quantity: item.quantity + 1 });
    };

    const handleSellingPriceChange = (itemId, newPrice) => {
        const price = parseFloat(newPrice);
        updateCartItem(itemId, { sellingPrice: isNaN(price) ? 0 : price });
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsSearchFocused(false);
                setHighlightedIndex(-1);
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



    const HandleCardProcessPayment = async () => {
        setLoading(true);
        const amountToPay = payingAmount > 0 ? payingAmount : sellingSubtotal;

        const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amountToPay * 100, currency: "INR" }),
        });

        if (!orderResponse.ok) {
            showAlert("Server error. Could not create Razorpay order.");
            setLoading(false);
            return;
        }
        const orderData = await orderResponse.json();

        const options = {
            key: "rzp_test_RM94Bh3gUaJSjZ",
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

    const isModalActive = isModalOpen || isNewCusModalOpen || isPreviewModalOpen;

    // 1. F2 to search (Escape is handled on the input's onKeyDown)
    useHotkeys('F2', () => productSearchInputRef.current?.focus(), {}, !isModalActive);

    // 2. Alt+E to search customer, Escape to close
    useHotkeys('e', () => setIsModalOpen(true), { altKey: true }, !isModalActive);
    //useHotkeys('Escape', () => setIsModalOpen(false), {}, isModalOpen);

    // 3. Alt+N to new customer, Escape to close
    useHotkeys('e', () => setIsNewCusModalOpen(true), {shiftKey:true, altKey: true }, !isModalActive);
   // useHotkeys('Escape', () => setIsNewCusModalOpen(false), {}, isNewCusModalOpen);

    // 4. Ctrl+Alt+N for New Billing
    useHotkeys('n', handleNewBilling, { ctrlKey: true, altKey: true }, !isModalActive);

    // 5. Ctrl+Alt+D to first discount input
    useHotkeys('d', () => discountInputRef.current?.focus(), { ctrlKey: true, altKey: true }, !isModalActive);

    // 6. Ctrl+Alt+R to remarks
    useHotkeys('p', () => remarksRef.current?.focus(), {  altKey: true }, !isModalActive);

    // 7. Alt+P to payment methods
    useHotkeys('m', () => paymentMethodRef.current?.focus(), { altKey: true }, !isModalActive);

    // 8. Ctrl+Alt+P to preview
    useHotkeys('p', handlePreview, { ctrlKey: true, altKey: true }, !isModalActive);
   // useHotkeys('Escape', () => setIsPreviewModalOpen(false), {}, isPreviewModalOpen);

    // 9. Alt+Enter to process payment
    useHotkeys('Enter', handleProcessPayment, { altKey: true }, !isModalActive && cart.length > 0);

    // --- (End of Hotkeys) ---


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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Billing</h2>
                <div style={{ position: 'absolute' }}> {/* Container for positioning */}
                    <button
                        onClick={() => setIsShortcutListVisible(!isShortcutListVisible)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            marginLeft: '10rem',
                            alignItems: 'center',
                            gap: '5px',
                            fontStyle: 'italic',
                            fontSize: '0.9rem',
                            opacity: 0.8,
                        }}
                    >
                        Shortcut keys
                        {isShortcutListVisible ? <FaTimes size={12} /> : <FaChevronDown size={12} />}
                    </button>

                    {/* --- NEW: Shortcut List Dropdown --- */}
                    {isShortcutListVisible && (
                        <div style={{
                            position: 'absolute',
                            top: '100%', // Position below the button
                            left: 0,
                            background: 'var(--modal-bg)', // Use modal background
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1100, // Ensure it's above other elements
                            padding: '10px',
                            minWidth: '250px', // Adjust width as needed
                        }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {shortcuts.map((shortcut, index) => (
                                    <li key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.85rem',
                                        padding: '6px 0',
                                        borderBottom: index < shortcuts.length - 1 ? '1px dashed var(--border-color)' : 'none'
                                    }}>
                                        <span>{shortcut.description}</span>
                                        <span style={{ display: 'flex', gap: '4px' }}>
                                                {shortcut.keys.map(key => (
                                                    <kbd key={key} className="shortcut-key"> {/* Use kbd tag and class */}
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="billing-layout-new" style={{ display: 'flex', gap: '20px' }}>

                <div className="current-bill-section" style={{ flex: 4 }}>
                    <div className="glass-card" style={{ padding: '1rem' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Current Bill</h3>
                            <div className="customer-actions" style={{ display: 'flex', gap: '10px' }}>
                                {/* --- UPDATED: Hint for shortcut --- */}
                                <button className="btn" onClick={() => setIsModalOpen(true)} title="Alt + E"><i
                                    className="fa-duotone fa-solid fa-user-magnifying-glass" style={{paddingRight:"5px"}}></i>
                                    {selectedCustomer ? `Change Customer` : 'Search Customer'}
                                </button>
                                {/* --- UPDATED: Hint for shortcut --- */}
                                <button className="btn" onClick={() => setIsNewCusModalOpen(true)} title="Shift + Alt + E">
                                    <i className="fa-duotone fa-solid fa-user-plus"></i> Create Customer
                                </button>
                                {cart.length > 0 && (
                                    // --- UPDATED: Hint for shortcut ---
                                    <button className="btn btn-danger" onClick={handleNewBilling} title="Ctrl + Alt + N"><i
                                        className="fa-duotone fa-solid fa-file-invoice" style={{paddingRight:"5px"}}></i>
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

                        <div className="product-search-container" ref={searchContainerRef} style={{ marginTop: '1rem', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.2rem 1rem' }}>
                                <FaSearch style={{ color: 'var(--text-color)' }} />
                                <input
                                    type="text"
                                    ref={productSearchInputRef}
                                    // --- UPDATED: Hint for shortcut ---
                                    placeholder="Search for products to add... (F2)"
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    // --- NEW: onKeyDown for Escape key ---
                                    onKeyDown={handleSearchKeyDown}
                                    style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-color)', fontSize: '1rem', outline: 'none' }}
                                />
                            </div>

                            {isSearchFocused && debouncedSearchTerm && (
                                <div className="search-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {products.length > 0 ? products.map((p, index) => (
                                        <div
                                            key={p.id}
                                            className="search-result-item"
                                            onClick={() => {
                                                handleAddProduct(p); // Add to cart
                                                setProductSearchTerm(''); // Clear search term
                                                // --- UPDATE: Keep focus and ensure dropdown can show ---
                                                setIsSearchFocused(true);
                                                productSearchInputRef.current?.focus(); // Keep focus
                                                setHighlightedIndex(-1); // Reset highlight
                                            }}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                borderBottom: '1px solid var(--border-color-light)',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s ease',
                                                backgroundColor: index === highlightedIndex ? 'var(--primary-color-light)' : 'transparent'
                                            }}
                                        >
                                            <div>
                                                <strong>{p.name}</strong>
                                                <div style={{ fontSize: '0.8em', color: '#888' }}>
                                                    Price: ₹{p.price} | Tax: {p.tax}% | Stock: {p.stock}
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div style={{padding: '1rem', textAlign: 'center', color: '#888'}}>No products found.</div>}
                                </div>
                            )}
                        </div>

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
                                            {/* --- UPDATED: Hint for shortcut --- */}
                                            <th>Discount%</th>
                                            <th>Base Price </th>
                                            <th>Tax </th>
                                            <th>Selling </th>
                                            <th>Details</th>
                                            <th>Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {cart.map((item, index) => { // --- UPDATED: Added index ---
                                            const taxRate = item.tax / 100;
                                            const basePrice = item.sellingPrice / (1 + taxRate);
                                            const totalTaxAmount = (item.sellingPrice - basePrice) * item.quantity;
                                            const totalBasePrice = basePrice * item.quantity;
                                            const totalSellingPrice = item.sellingPrice * item.quantity;
                                            const totalListPrice = (item.listPrice || item.price);

                                            const sellingPriceCellStyle = {
                                                verticalAlign: 'middle',
                                                transition: 'background-color 0.3s ease'
                                            };

                                            if (item.sellingPrice < item.costPrice) {
                                                sellingPriceCellStyle.backgroundColor = '#e8a2ad';
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
                                                            // --- NEW: Conditional ref for the first item ---
                                                            ref={index === 0 ? discountInputRef : null}
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

                <div className="summary-section glass-card" style={{ flex: 1, padding: '1rem', height: 'fit-content' }}>
                    <h3 style={{ textAlign: 'center', marginTop: 0 }}>Summary</h3>
                    <div className="invoice-summary">
                        <p>Total without GST: <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        <p className="tax">GST: <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>

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

                        {showPartialBilling && (
                            <>
                                <div className="payment-input-group" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    margin: '1rem 0 0.5rem 0',
                                    gap: '10px'
                                }}>
                                    <label style={{ fontWeight: 500, color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>
                                        Paying:
                                    </label>
                                    <input
                                        type="number"
                                        ref={remarksRef}
                                        value={payingAmount}
                                        onChange={(e) => {
                                            setPayingAmount(parseFloat(e.target.value) || 0);
                                            setIsPayingAmountManuallySet(true);
                                        }}
                                        style={{
                                            width: '40%',
                                            padding: '10px',
                                            borderRadius: '15px',
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
                            </>
                        )}


                        {showRemarks && (
                            <div className="remarks-section" style={{ margin: '1rem 0' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                                    {/* --- UPDATED: Hint for shortcut --- */}
                                    Remarks:
                                </label>
                                <textarea
                                    // --- NEW: Add ref ---

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
                        )}

                        {/* --- UPDATED: Add ref, tabIndex, and hint --- */}
                        <div
                            ref={paymentMethodRef}
                            tabIndex="-1" // Makes the div focusable
                            className="payment-methods"
                            style={{ marginTop: '1rem', outline: 'none' }} // outline:none removes focus ring
                        >
                            <h5 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Payment Method:</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { type: 'CASH', icon: 'fa-duotone fa-money-bills', key: 'cash' },
                                    { type: 'CARD', icon: 'fa-duotone fa-solid fa-credit-card', key: 'card' },
                                    { type: 'UPI', icon: 'fa-duotone fa-solid  fa-qrcode', key: 'upi' }
                                ].map(method => {
                                    const enabled = availableMethods?.[method.key];

                                    return (
                                        <label
                                            key={method.type}
                                            title={!enabled ? 'Contact support to enable this payment method' : ''}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                gap: '10px',
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
                                            <i
                                                className={`fa-fw ${method.icon}`}
                                                style={{
                                                    fontSize: '1.2rem',
                                                    color: enabled
                                                        ? paymentMethod === method.type
                                                            ? 'var(--primary-color)'
                                                            : 'var(--text-color)'
                                                        : '#888',
                                                }}
                                            />

                                            <input
                                                type="radio"
                                                value={method.type}
                                                checked={paymentMethod === method.type}
                                                onChange={e => enabled && setPaymentMethod(e.target.value)}
                                                disabled={!enabled}
                                                style={{ accentColor: 'var(--primary-color)' }}
                                            />
                                            <span>{method.type}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* --- UPDATED: Hint for shortcut --- */}
                        <button
                            className="process-payment-btn"
                            onClick={handleProcessPayment}
                            disabled={loading || cart.length === 0}
                            title="Alt + Enter"
                        >
                            {loading ? 'Processing...' : 'Process Payment'}
                        </button>
                        {/* --- UPDATED: Hint for shortcut --- */}
                        <button className="btn" onClick={handlePreview} disabled={cart.length === 0} title="Ctrl + Alt + P">
                            Preview
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            <Modal title="Select Customer (Alt+E)" show={isModalOpen} onClose={handleCloseSearchModal}>
                {/* ... (rest of modal) ... */}
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearchTerm}
                    onKeyDown={handleCustomerSearchKeyDown} // <-- ADD THIS HANDLER
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                />
                <ul
                    className="customer-modal-list"
                    ref={customerListRef} // <-- ADD REF
                    tabIndex="0" // <-- MAKES THE LIST FOCUSABLE
                    onKeyDown={handleCustomerListKeyDown} // <-- ADD KEY HANDLER
                    style={{ outline: 'none' }} // <-- Hides focus ring from the list
                >
                    {isCustomerLoading ? (
                        <li style={{ textAlign: 'center' }}>Loading...</li>
                    ) : customerSearchResults.length > 0 ? (

                        // --- ADD 'index' to your map ---
                        customerSearchResults.map((c, index) => (
                            <li
                                key={c.id}

                                // --- UPDATE onClick ---
                                onClick={() => handleCustomerSelect(c)}

                                // --- ADD onMouseEnter ---
                                onMouseEnter={() => setHighlightedCustomerIndex(index)}

                                // --- ADD STYLE for highlight ---
                                style={{
                                    backgroundColor: index === highlightedCustomerIndex ? 'var(--primary-color-light)' : 'transparent',
                                    cursor: 'pointer'
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
            <Modal title="Add New Customer (Shift+Alt+E)" show={isNewCusModalOpen} onClose={handleCloseNewCustomerModal}>
                {/* ... (rest of modal) ... */}
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
            <Modal title="Order Summary (Ctrl+Alt+P)" show={isPreviewModalOpen} onClose={handleClosePreviewModal}>
                {/* ... (rest of modal) ... */}
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
                    title="Alt + Enter"
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

            {/* --- UPDATED: Use the Modal component for the success popup --- */}
            <Modal
                title="✅ Payment Successful"
                show={showPopup}
                onClose={() => setShowPopup(false)} // Modal handles Escape key
            >
                {/* --- Children for the Modal --- */}
                <div style={{ textAlign: 'center' }}> {/* Center content */}
                    <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                        Order Reference: <strong>{orderRef}</strong>
                    </p>
                    <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                        Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong>
                    </p>

                    {remainingAmount > 0 && (
                        <p style={{ fontSize: '1.1rem', margin: '0.5rem 0', color: '#d9534f' }}>
                            Amount Remaining: <strong>₹{remainingAmount.toLocaleString()}</strong>
                        </p>
                    )}

                    {/* Button Container */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginTop: '1.5rem',
                        flexWrap: 'wrap'
                    }}>
                        {/* Close Button (Now handled by Modal's default close button, but we can keep one here too) */}
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

                        {/* Email Button */}
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onClick={() => handleSendEmail(orderRef)}
                                disabled={isSendingEmail}
                            >
                                <FaPaperPlane size={20} />
                                {isSendingEmail ? 'Sending...' : 'Send to Email'}
                            </button>
                        )}

                        {/* Print Button */}
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
                {/* --- End of Children --- */}
            </Modal>
        </div>
    );
};

export default BillingPage;