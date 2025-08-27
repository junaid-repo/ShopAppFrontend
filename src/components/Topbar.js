// src/components/Topbar.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "../pages/ConfigProvider";

const Topbar = ({ onLogout }) => {
    const [userName, setUserName] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const navigate = useNavigate();
    const token = localStorage.getItem("jwt_token");
      const config = useConfig();
          var apiUrl="";
            if(config){
            console.log(config.API_URL);
            apiUrl=config.API_URL;
            }

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');

        (async () => {
            try {
                if (token) {
                    const decoded = jwtDecode(token);
                    const username = decoded.sub;
                    console.log("Decoded username:", username);
                    setUserName(username);

                    const res = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const arrayBuffer = await res.arrayBuffer();
                    const blob = new Blob([arrayBuffer]);
                    const imageUrl = URL.createObjectURL(blob);
                    setProfilePic(imageUrl);
                }
            } catch (err) {
                console.error('Failed to load profile pic', err);
            }
        })();
    }, []);

    const handleProfileClick = () => {
        navigate('/profile');
    };

     const handleLogout = () => {
          if (window.confirm("Are you sure you want to log out?")) {
              onLogout();          // ✅ update App state
              navigate("/login");  // ✅ forward user
          }
      };

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            background: '#f0f8ff00',
            borderRadius: '100px',
            boxShadow: '#00000000'
        }}>
            {/* Search */}
            <div style={{ flex: 1, marginRight: '20px' }}>
                <input
                    type="text"
                    placeholder="Search..."
                    style={{
                        width: '90%',
                        padding: '0.75rem 1.25rem',
                        border: '1px solid rgba(201, 231, 241, 0.77)',
                        borderRadius: '100px',
                        marginBottom: '25px',
                        background: '#ffffff',
                        fontSize: '1rem',
                       // display: 'none',
                        outline: 'none'
                    }}
                />
            </div>

            {/* User Profile + Logout */}
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div
                    onClick={handleProfileClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '50px',
                        background: '#f0f8ff',
                        border: '1px solid rgba(224, 247, 255, 0.5)',
                        boxShadow: '0 2px 8px rgb(0 0 0 / 15%)',
                        cursor: 'pointer'
                    }}
                >
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile"
                            style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #00aaff'
                            }}
                        />
                    ) : (
                        <FaUserCircle size={50} color="#00aaff" />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{
                            fontSize: '0.75rem',
                            color: '#666',
                            marginBottom: '2px'
                        }}>
                            Logged in as
                        </span>
                        <span style={{
                            fontWeight: 600,
                            color: '#333',
                            whiteSpace: 'nowrap'
                        }}>
                            {userName || 'Guest'}
                        </span>
                    </div>
                </div>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#ff4d4f",
                        color: "#fff",
                        border: "none",
                        borderRadius: "25px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "600",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                    }}
                >
                    <FaSignOutAlt /> Logout
                </button>
            </div>
        </header>
    );
};

export default Topbar;
