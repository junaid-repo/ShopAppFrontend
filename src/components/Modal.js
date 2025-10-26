// src/components/Modal.js
import React, { useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
// import './Modal.css'; // Your modal CSS

const Modal = ({ show, onClose, title, children }) => {
    const modalRef = useRef(null);

    // This is the query to find all focusable elements
    const focusableQuery = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // This effect handles all keyboard interaction for the modal
    useEffect(() => {
        if (!show) {
            return;
        }

        // Store the element that was focused *before* the modal opened
        const lastFocusedElement = document.activeElement;

        const handleKeyDown = (e) => {
            // 1. Handle Escape key
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            // 2. Handle Tab key (the focus trap)
            if (e.key === 'Tab') {
                if (!modalRef.current) return;

                // Find all focusable elements within the modal
                const focusableElements = Array.from(modalRef.current.querySelectorAll(focusableQuery));
                if (focusableElements.length === 0) return; // No focusable elements

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    // --- Shift + Tab ---
                    // If focus is on the first element, wrap to the last
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    // --- Just Tab ---
                    // If focus is on the last element, wrap to the first
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        // Add the keyboard listener
        document.addEventListener('keydown', handleKeyDown);

        // --- Focus the first element inside the modal when it opens ---
        const focusTimer = setTimeout(() => {
            if (modalRef.current) {
                const firstFocusable = modalRef.current.querySelector(focusableQuery);
                if (firstFocusable) {
                    firstFocusable.focus();
                } else {
                    // As a fallback, focus the modal container itself
                    modalRef.current.focus();
                }
            }
        }, 100); // 100ms delay helps ensure elements are rendered

        // Cleanup function
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(focusTimer);
            // --- Return focus to the element that opened the modal ---
            lastFocusedElement?.focus();
        };

    }, [show, onClose]); // This effect *needs* onClose to be stable

    if (!show) {
        return null;
    }

    // Use your existing modal structure
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                ref={modalRef} // --- ADD THIS ---
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                tabIndex="-1" // --- ADD THIS ---
            >
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                    <button onClick={onClose} className="close-btn"><FaTimes /></button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;