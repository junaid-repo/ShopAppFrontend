import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaCrown } from 'react-icons/fa';
import './SubscriptionPage.css'; // We will create this CSS file
import { useConfig } from "./ConfigProvider";
import { usePremium } from '../context/PremiumContext';
import toast from 'react-hot-toast';

// Helper component for listing features
const FeatureItem = ({ children }) => (
    <li className="feature-item">
        <FaCheckCircle color="var(--theme-color)" />
        <span>{children}</span>
    </li>
);

const SubscriptionPage = () => {
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const { setIsPremium } = usePremium();
    const navigate = useNavigate();

    // State to track loading for each button
    const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
    const [isYearlyLoading, setIsYearlyLoading] = useState(false);

    // --- Calculate Savings ---
    const monthlyPrice = 199;
    const yearlyPrice = 1999;
    const annualCostOfMonthly = monthlyPrice * 12;
    const savings = annualCostOfMonthly - yearlyPrice;
    const savingsPercentage = Math.round((savings / annualCostOfMonthly) * 100);

    /**
     * This is the main 3-step payment function.
     * It follows the exact flow you described.
     */
    const handlePayment = async (planType, amount) => {
        if (planType === 'MONTHLY') {
            setIsMonthlyLoading(true);
        } else {
            setIsYearlyLoading(true);
        }

        let subscriptionId = null;

        try {
            // --- Step A & B: Create Subscription Record ---
            // The backend creates a "PENDING" subscription and a Razorpay order
            const createSubResponse = await fetch(`${apiUrl}/api/shop/subscription/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planType: planType, // "MONTHLY" or "YEARLY"
                    amount: amount * 100
                }),
            });

            if (!createSubResponse.ok) {
                throw new Error('Failed to create subscription order.');
            }

            const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount * 100, currency: "INR" }),
            });

            if (!orderResponse.ok) {


                return;
            }
            const orderData2 = await orderResponse.json();




            // --- Step C: Get Order Details ---
            // Backend returns { orderId, subscriptionId (your DB id), amount }
            const orderData = await createSubResponse.json();
            subscriptionId = orderData.subscriptionId; // Store this for the verification step

            // --- Step D: Open Razorpay Gateway ---
            // This logic is from your BillingPage.js

            const options = {
                key: "rzp_test_RM94Bh3gUaJSjZ",
                order_id: orderData2.id,
                amount: orderData.amount,
                name: "ClearBill Premium",
                description: "Subscription",

                // --- Step E: Payment Handler ---
                handler: async (response) => {
                    // --- Step F: Verify Payment ---
                    // Send Razorpay details AND your subscriptionId to backend
                    const verifyResponse = await fetch(`${apiUrl}/api/shop/subscription/verify`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            subscriptionId: subscriptionId // Your internal DB ID
                        }),
                    });

                    if (!verifyResponse.ok) {
                        throw new Error('Payment verification failed.');
                    }

                    // --- Step G & H: Success ---
                    // Backend has now updated user role to ROLE_PREMIUM
                    toast.success('Upgrade successful! Welcome to Premium.');
                    setIsPremium(true); // Update global context
                    navigate('/dashboard'); // Redirect to dashboard
                },

                theme: { color: "#3399cc" },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response) => {
                toast.error(`Payment Failed: ${response.error.description}`);
                // Optional: You could call backend to mark subscription as "FAILED"
            });
            rzp.open();

        } catch (err) {
            console.error("Payment flow error:", err);
            toast.error(err.message || "An error occurred. Please try again.");
        } finally {
            setIsMonthlyLoading(false);
            setIsYearlyLoading(false);
        }
    };


    return (
        <div className="subscription-page-container">
            <div className="subscription-header">
                <FaCrown size={48} />
                <h1>Go Premium</h1>
                <p>Unlock powerful features to supercharge your business.</p>
            </div>

            <div className="subscription-content">
                {/* --- Feature List --- */}
                <div className="features-list-card">
                    <h2>Premium Features Include:</h2>
                    <ul>
                        <FeatureItem>Unlimited Invoices (removes 20/day limit)</FeatureItem>
                        <FeatureItem>Bulk Product Upload via CSV</FeatureItem>
                        <FeatureItem>Advanced Analytics & Reports</FeatureItem>
                        <FeatureItem>Detailed Customer Insights</FeatureItem>
                        <FeatureItem>Priority Email Support</FeatureItem>
                        <FeatureItem>All Future Premium Updates</FeatureItem>
                    </ul>
                </div>

                {/* --- Plan Options --- */}
                <div className="plans-container">

                    {/* --- Monthly Plan --- */}
                    <div className="plan-card">
                        <div className="plan-header">
                            <h3>Monthly</h3>
                            <p className="plan-price">
                                ₹{monthlyPrice}
                                <span>/ month</span>
                            </p>
                        </div>
                        <p className="plan-billed-info">Billed every month</p>
                        <button
                            className="btn-subscribe"
                            onClick={() => handlePayment('MONTHLY', monthlyPrice)}
                            disabled={isMonthlyLoading || isYearlyLoading}
                        >
                            {isMonthlyLoading ? 'Processing...' : 'Choose Monthly'}
                        </button>
                    </div>

                    {/* --- Yearly Plan --- */}
                    <div className="plan-card popular">
                        <div className="plan-badge">Best Value</div>
                        <div className="plan-header">
                            <h3>Yearly</h3>
                            <p className="plan-price">
                                ₹{yearlyPrice}
                                <span>/ year</span>
                            </p>
                        </div>
                        <p className="plan-billed-info">Billed once per year</p>
                        <button
                            className="btn-subscribe"
                            onClick={() => handlePayment('YEARLY', yearlyPrice)}
                            disabled={isMonthlyLoading || isYearlyLoading}
                        >
                            {isYearlyLoading ? 'Processing...' : 'Choose Yearly'}
                        </button>
                        <p className="plan-savings">
                            Save {savingsPercentage}% (₹{savings}) vs Monthly
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;