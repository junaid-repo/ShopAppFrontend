// src/context/AlertContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

// 1. Create the context
const AlertContext = createContext();

// 2. Create a custom hook for easy access
export const useAlert = () => useContext(AlertContext);

// 3. Create the Provider component
export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState(null); // null when hidden, { message: '...' } when shown

    // Use useCallback to memoize the functions so they don't change on every render
    const showAlert = useCallback((message) => {
        setAlert({ message });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(null);
    }, []);

    const value = { alert, showAlert, hideAlert };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
};