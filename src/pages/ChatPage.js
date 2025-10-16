import React, { useState, useEffect, useRef } from 'react';
// Added FaComment and FaTimesCircle icons for the new buttons
import { FaPaperPlane, FaArrowLeft, FaPlus, FaComment, FaTimesCircle } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider";
import './ChatPage.css'; // Your existing CSS
import './TicketSystem.css'; // New CSS for the ticketing components

const ChatPage = ({ setSelectedPage }) => {
    // --- State Management ---
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', or 'chat'
    const [newTicketTopic, setNewTicketTopic] = useState('');
    const [newTicketSummary, setNewTicketSummary] = useState('');
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [closingRemarks, setClosingRemarks] = useState('');
    // Using useState for username is cleaner and more idiomatic for React
    const [username, setUsername] = useState('');

    const stompClientRef = useRef(null);
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const messagesEndRef = useRef(null);

    // --- API Functions ---

    // 1. Fetch User Profile and Tickets
    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error(`User session fetch failed`);
            const userData = await userRes.json();
            setUsername(userData.username); // Set username from profile

            const ticketsRes = await fetch(`${apiUrl}/api/tickets/my-latest`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!ticketsRes.ok) throw new Error("Failed to fetch tickets");
            const data = await ticketsRes.json();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            setTickets([]); // Default to empty array on error
        } finally {
            setIsLoading(false);
        }
        /*
        // EXPECTED SUCCESS RESPONSE for /api/tickets/my-latest
        [
            {
                "ticketNumber": "TKT-78902",
                "creationDate": "2023-10-27T11:30:00Z",
                "topic": "Product",
                "summary": "Cannot find the new feature...",
                "status": "Open",
                "closingRemarks": "",
                "chatHistory": [  // <-- This array should be included
                    { "sender": "User_123", "content": "Ticket Summary: Cannot find..." },
                    { "sender": "Admin_Support", "content": "Hi there, which feature are you looking for?" }
                ]
            },
            // ... more tickets
        ]
        */
    };

    // 2. Create a New Ticket
    const createTicket = async () => {
        if (!newTicketTopic || !newTicketSummary) {
            alert("Please provide a topic and summary.");
            return null;
        }
        const payload = { "topic": newTicketTopic, "summary": newTicketSummary, "status": "Open" };
        try {
            const response = await fetch(`${apiUrl}/api/tickets/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to create ticket");
            return await response.json();
        } catch (error) {
            console.error("Error creating ticket:", error);
            return null;
        }
    };

    // 3. Close a Ticket API call (now takes arguments)
    const closeTicketAPI = async (ticketToClose, remarks) => {
        const payload = { "ticketNumber": ticketToClose.ticketNumber, "status": "Closed", "closingRemarks": remarks };
        try {
            const response = await fetch(`${apiUrl}/api/tickets/update`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to close ticket");
            return true;
        } catch (error) {
            console.error("Error closing ticket:", error);
            return false;
        }
    };

    // --- WebSocket Functions ---
    const connectToChat = (ticket, isNewTicket) => {
        if (stompClientRef.current?.active || !apiUrl) return;
        const chatId = ticket.ticketNumber;

        const onConnect = () => {
            console.log('User Connected for Ticket:', chatId);
            setIsConnected(true);

            stompClientRef.current.subscribe(`/topic/chat/${chatId}`, (payload) => {
                setMessages(prev => [...prev, JSON.parse(payload.body)]);
            });

            stompClientRef.current.publish({
                destination: '/app/chat.notifyAdmin',
                body: JSON.stringify({ sender: username, chatId: chatId, content: `Topic: ${ticket.topic}`, type: 'JOIN' })
            });

            // Only send the initial summary if it's a brand new ticket
            if (isNewTicket) {
                stompClientRef.current.publish({
                    destination: '/app/chat.sendMessage',
                    body: JSON.stringify({ sender: username, content: `Ticket Summary: ${ticket.summary}`, chatId: chatId, type: 'CHAT' })
                });
            }
        };

        const getWebSocketUrl = (url) => { try { return `${new URL(url).origin}/ws`; } catch (e) { return ''; } };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return;

        stompClientRef.current = new Client({
            webSocketFactory: () => new SockJS(webSocketUrl),
            onConnect,
            reconnectDelay: 5000,
        });
        stompClientRef.current.activate();
    };

    const sendMessage = (event) => {
        event.preventDefault();
        if (inputValue.trim() && isConnected) {
            const chatMessage = { sender: username, content: inputValue, chatId: activeTicket.ticketNumber, type: 'CHAT' };
            stompClientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify(chatMessage) });
            setInputValue('');
        }
    };

    // --- Handlers ---
    const handleCreateTicket = async () => {
        const newTicket = await createTicket();
        if (newTicket) {
            setActiveTicket(newTicket);
            // For a new ticket, the history is just the initial summary message
            setMessages([{
                sender: username,
                content: `Ticket Summary: ${newTicket.summary}`,
                type: 'CHAT'
            }]);
            setView('chat');
            connectToChat(newTicket, true); // 'true' because it's a new ticket
        }
    };

    // NEW: Handler to continue chat using existing data
    const handleContinueChat = async (ticket) => {
        setActiveTicket(ticket);
        // Use the chat history that was already fetched from the API
        //setMessages(ticket.chatHistory || []);
        setView('chat');
        console.log("reacher here with", ticket.ticketNumber);
        try {
            const response = await fetch(`${apiUrl}/api/chat-history/${ticket.ticketNumber}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                const history = await response.json();
                setMessages(history); // Populate the chat window with the history
            } else {
                // If fetching fails, start with an empty chat
                setMessages([]);
            }
        } catch (error) {
            console.error("Error fetching chat history:", error);
            setMessages([]);
        }
        connectToChat(ticket, false); // False flag indicates it's an existing ticket
    };

    // NEW: Handler to set the active ticket and open the close modal
    const handleOpenCloseModal = (ticket) => {
        setActiveTicket(ticket);
        setIsCloseModalOpen(true);
    };


    // UPDATED: Handler for submitting the close ticket form
    const handleCloseTicketSubmit = async () => {
        if (!closingRemarks) {
            alert("Please provide closing remarks.");
            return;
        }
        const success = await closeTicketAPI(activeTicket, closingRemarks);
        if (success) {
            setIsCloseModalOpen(false);
            setClosingRemarks('');

            if (view === 'chat') {
                // If in chat view, disconnect and navigate away
                if (stompClientRef.current?.active) stompClientRef.current.deactivate();
                setSelectedPage('dashboard');
            } else {
                // If in list view, just refresh the list to show the "Closed" status
                fetchInitialData();
            }
        }
    };

    // --- Effects ---
    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        return () => { if (stompClientRef.current?.active) stompClientRef.current.deactivate(); };
    }, []);

    // --- Render Logic ---
    if (view === 'chat') {
        return (
            <div className="chat-window-page">
                <div className="chat-header">
                    <span>Ticket: {activeTicket.ticketNumber} ({activeTicket.topic})</span>
                    <div className="chat-header-actions">
                        <button className="back-link-button" onClick={() => { setView('list'); if (stompClientRef.current?.active) stompClientRef.current.deactivate(); }}>
                            <FaArrowLeft /> Back to Tickets
                        </button>
                        <button className="close-btn-link" onClick={() => handleOpenCloseModal(activeTicket)}>Close Ticket</button>
                    </div>
                </div>
                <div className="messages-list">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-item ${msg.sender === username ? 'user' : 'admin'}`}>
                            {msg.content}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form className="message-input-form" onSubmit={sendMessage}>
                    <input type="text" placeholder={isConnected ? "Type a message..." : "Connecting..."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={!isConnected} autoFocus />
                    <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                </form>
            </div>
        );
    }

    if (view === 'create') {
        return (
            <div className="topic-selection-container glass-card">
                <button className="back-link-button" onClick={() => setView('list')}><FaArrowLeft /> Back to Tickets</button>
                <h2>Create New Support Ticket</h2>
                <div className="form-group"><label>Topic</label><select value={newTicketTopic} onChange={(e) => setNewTicketTopic(e.target.value)}><option value="">-- Select a Topic --</option><option value="Product">Product</option><option value="Customers">Customers</option><option value="Sales">Sales</option><option value="Billings">Billings</option></select></div>
                <div className="form-group"><label>Summary</label><textarea placeholder="Briefly describe your issue..." value={newTicketSummary} onChange={(e) => setNewTicketSummary(e.target.value)} /></div>
                <div className="form-actions"><button className="btn" onClick={handleCreateTicket}>Save & Start Chat</button></div>
            </div>
        )
    }

    // Default view: 'list' with actionable rows
    return (
        <div className="ticket-list-container">
            {isCloseModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Close Ticket {activeTicket?.ticketNumber}</h3>
                        <p>Please provide a reason for closing this ticket.</p>
                        <textarea placeholder="Closing remarks..." value={closingRemarks} onChange={(e) => setClosingRemarks(e.target.value)} />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setIsCloseModalOpen(false)}>Cancel</button>
                            <button className="btn" onClick={handleCloseTicketSubmit}>Submit & Close</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="ticket-list-header">
                <h2>My Support Tickets</h2>
                <button className="btn" onClick={() => setView('create')}><FaPlus /> Create New Ticket</button>
            </div>
            {isLoading ? <p>Loading tickets...</p> : (
                <div className="tickets-table-wrapper">
                    <table className="data-table">
                        <thead>
                        <tr>
                            <th>Ticket #</th>
                            <th>Created On</th>
                            <th>Topic</th>
                            <th>Summary</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tickets.map(ticket => (
                            <tr key={ticket.ticketNumber}>
                                <td>{ticket.ticketNumber}</td>
                                <td>{new Date(ticket.creationDate).toLocaleDateString()}</td>
                                <td>{ticket.topic}</td>
                                <td>{ticket.summary}</td>
                                <td><span className={`status-badge status-${ticket.status.toLowerCase()}`}>{ticket.status}</span></td>
                                <td>
                                    {ticket.status === 'open' && (
                                        <div className="ticket-actions">
                                            <button className="action-btn continue" title="Continue Chat" onClick={() => handleContinueChat(ticket)}>
                                                <FaComment /> Chat
                                            </button>
                                            <button className="action-btn close" title="Close Ticket" onClick={() => handleOpenCloseModal(ticket)}>
                                                <FaTimesCircle /> Close
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ChatPage;