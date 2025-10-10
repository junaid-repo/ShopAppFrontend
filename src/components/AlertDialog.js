// src/components/AlertDialog.js
import React from 'react';
import { useAlert } from '../context/AlertContext';

const AlertDialog = () => {
    const { alert, hideAlert } = useAlert();

    // If there's no alert message, render nothing
    if (!alert) {
        return null;
    }

    // Basic inline styles for the dialog
    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(250,246,246,0.17)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        },
        dialog: {
            background: 'white',
            borderRadius: '25px',
            padding: '20px 30px 20px 20px' ,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            maxWidth: '400px',
            textAlign: 'center',
        },
        button: {
            marginTop: '20px',
            padding: '10px 25px',
            border: 'none',
            borderRadius: '50px',
            backgroundColor: '#007bff',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',



        }
    };

    return (
        <div style={styles.overlay} onClick={hideAlert}>
            <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <p>{alert.message}</p>
                <button className="btn" onClick={hideAlert}>
                    OK
                </button>
            </div>
        </div>
    );
};

export default AlertDialog;