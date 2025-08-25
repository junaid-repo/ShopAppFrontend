// src/components/Topbar.js
import React from 'react';
import { FaUserCircle } from 'react-icons/fa';
import './Topbar.css';

const Topbar = () => {
    return (
        <header className="topbar">
            <div className="topbar-search">
                <input type="text" placeholder="Search..." className="search-bar" />
            </div>
            <div className="topbar-user">
                <FaUserCircle size={32} />
            </div>
        </header>
    );
};

export default Topbar;