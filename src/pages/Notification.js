import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from './ConfigProvider';
import { useSearchKey } from '../context/SearchKeyContext';
import {FaCheck, FaFlag, FaTrash} from "react-icons/fa";
const domainToRoute = {
    products: 'products',
    sales: 'sales',
    customers: 'customers',
};

const Notification = ({ setSelectedPage }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDomain, setFilterDomain] = useState('all');
    const [showSeen, setShowSeen] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const config = useConfig();
    const apiUrl = config ? config.API_URL : '';
    const navigate = useNavigate();
    const { setSearchKey } = useSearchKey();
    const ITEMS_PER_PAGE = 5;

    const [leftPanelWidth, setLeftPanelWidth] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchAllNotifications();
    }, [apiUrl, currentPage, filterDomain, showSeen, sortOrder]);

    useEffect(() => {
        if (containerRef.current && leftPanelWidth === null) {
            setLeftPanelWidth(containerRef.current.offsetWidth * 0.40);
        }
    }, [containerRef.current]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            const minWidth = 300;
            const maxWidth = containerRect.width - minWidth;
            if (newWidth > minWidth && newWidth < maxWidth) {
                setLeftPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const fetchAllNotifications = async () => {
        setLoading(true);
        setSelectedNotification(null);
        try {
            const url = new URL(`${apiUrl}/api/shop/notifications/all`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            if (filterDomain !== 'all') url.searchParams.append('domain', filterDomain);
            if (showSeen !== 'all') url.searchParams.append('seen', showSeen);
            url.searchParams.append('sort', sortOrder);
            const res = await fetch(url, { method: 'GET', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.seen) {
            updateNotificationStatus(notif.id, 'seen');
        }
        setSelectedNotification(notif);
    };

    const updateNotificationStatus = async (notificationId, status) => {
        try {
            await fetch(`${apiUrl}/api/shop/notifications/update-status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId, status }),
            });
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, seen: status === 'seen' } : n)
            );
        } catch (err) {
            console.error("Failed to update notification status:", err);
        }
    };

    const handleDelete = async (notificationId) => {
        if (!window.confirm("Are you sure you want to delete this notification?")) return;
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/delete/${notificationId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to delete notification');
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setSelectedNotification(null);
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    const handleFlag = async (notificationId) => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/flag/${notificationId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to flag notification');
            const updatedNotification = await res.json();
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, flagged: updatedNotification.flagged } : n)
            );
            if (selectedNotification && selectedNotification.id === notificationId) {
                setSelectedNotification(prev => ({ ...prev, flagged: updatedNotification.flagged }));
            }
        } catch (err) {
            console.error("Error flagging notification:", err);
        }
    };

    const handleTakeAction = (notif) => {
        const route = domainToRoute[notif.domain];
        if (!route) return;
        setSearchKey(notif.searchKey);
        if (setSelectedPage) {
            setSelectedPage(route);
        } else {
            navigate(`/${route}`);
        }
    };

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)} day(s) ago`;
    };

    // CHANGE 2: New function to format the exact date and time
    const getFormattedDateTime = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    return (
        <div className="page-container" style={{display:"flex", flexDirection:"column"}}>
            <h2 style={{ marginBottom: "20px" }}>Notifications</h2>
            <div className="glass-card" style={{ marginBottom: "2rem", padding: "1rem" }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label>
                        Filter Domain:
                        <select className="date-input" value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
                            <option value="all">All</option>
                            <option value="products">Products</option>
                            <option value="sales">Sales</option>
                            <option value="customers">Customers</option>
                        </select>
                    </label>
                    <label>
                        Show:
                        <select className="date-input" value={showSeen} onChange={e => setShowSeen(e.target.value)}>
                            <option value="all">All</option>
                            <option value="seen">Read</option>
                            <option value="unseen">Unread</option>
                        </select>
                    </label>
                    <label>
                        Sort:
                        <select className="date-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </label>
                </div>
            </div>
            <div ref={containerRef} style={{ display: 'flex', flex: 1, minHeight: 0 }} onMouseUp={() => setIsDragging(false)}>
                <div className="glass-card" style={{ flex: `0 0 ${leftPanelWidth}px`, padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '500px', overflow: 'hidden' }}>
                    {loading ? (<div>Loading...</div>) : notifications.length === 0 ? (<div>No notifications found.</div>) : (
                        <>
                            <div style={{ flex: 1, overflowY: 'auto', marginRight: '-1rem', paddingRight: '1rem' }}>
                                {notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',  // smooth transition for background + movement
                                            background:
                                                selectedNotification?.id === notif.id
                                                    ? '#e0f3ff'
                                                    : notif.seen
                                                        ? 'rgba(0,170,255,0.08)'
                                                        : '#f9f9f9',
                                            borderLeft:
                                                selectedNotification?.id === notif.id
                                                    ? '4px solid #0056b3'
                                                    : notif.seen
                                                        ? '4px solid #ddd'
                                                        : '4px solid var(--primary-color)',
                                            transform: selectedNotification?.id === notif.id ? 'translateX(6px)' : 'translateX(0)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600 }}>{notif.title}</div>
                                            <div
                                                style={{
                                                    fontSize: '0.8rem',
                                                    color: '#888',
                                                    flexShrink: 0,
                                                    marginLeft: '10px',
                                                }}
                                            >
                                                {getRelativeTime(notif.createdAt)}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.9rem',
                                                color: '#555',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {notif.message}
                                        </div>
                                    </div>

                                ))}
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="pagination-btn">&laquo; Prev</button>
                                <span>Page {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="pagination-btn">Next &raquo;</button>
                            </div>
                        </>
                    )}
                </div>
                <div onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
                     style={{
                         width: '10px', cursor: 'col-resize',
                         marginLeft: '1rem', marginRight: '1rem', borderRadius: '5px', flexShrink: 0,
                         transition: 'background-color 0.2s ease'
                     }}/>
                <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {selectedNotification ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                {/* CHANGE 4: Increased title size and improved spacing */}
                                <div style={{display: "flex", flexDirection:"column"}}>
                                    <h3 style={{ margin: 0,  fontSize: '1.6rem' }}>{selectedNotification.title}</h3>
                                    {/* CHANGE 2: Added exact date and time display */}
                                    <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '8px' }}>
                                        {getFormattedDateTime(selectedNotification.createdAt)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {/* CHANGE 3: Updated button colors and added icons */}
                                    <button className="btn" style={{ backgroundColor: '#28a745' }} onClick={() => handleTakeAction(selectedNotification)}>
                                        <FaCheck size={14}/> Take Action
                                    </button>
                                    <button className="btn" style={{ backgroundColor: '#ffc107' }} onClick={() => handleFlag(selectedNotification.id)}>
                                        <FaFlag size={14}/> Flag
                                    </button>
                                    <button className="btn" style={{ backgroundColor: '#dc3545' }} onClick={() => handleDelete(selectedNotification.id)}>
                                        <FaTrash size={14}/> Delete
                                    </button>
                                </div>
                            </div>
                            <div style={{}}>
                                {/* CHANGE 4: Increased spacing */}
                                <div style={{ marginBottom: '2rem', marginTop: '1.5rem' }}>
                                    <strong style={{  marginBottom: '8px' }}>Subject: </strong>
                                    <span>{selectedNotification.message}</span>
                                </div>
                                <div>

                                    <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedNotification.details || 'No additional details provided.'}</p>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: 'auto', paddingTop: '1rem', textAlign: 'right' }}>
                                Received: {getRelativeTime(selectedNotification.createdAt)}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                            <p>Select a notification to view its details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notification;