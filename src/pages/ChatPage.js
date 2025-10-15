import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaArrowLeft, FaPlus } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider";
import './ChatPage.css'; // Your existing CSS
import './TicketSystem.css'; // New CSS for the ticketing components

// --- Mock Data (as requested) ---
const mockTickets = [
    { ticketNumber: 'TKT-78901', creationDate: '2023-10-26T10:00:00Z', topic: 'Billings', summary: 'My last invoice seems incorrect.', status: 'Closed', closingRemarks: 'Resolved by support.' },
    { ticketNumber: 'TKT-78902', creationDate: '2023-10-27T11:30:00Z', topic: 'Product', summary: 'Cannot find the new feature you announced.', status: 'Open', closingRemarks: '' },
    { ticketNumber: 'TKT-78903', creationDate: '2023-10-28T09:00:00Z', topic: 'Sales', summary: 'Question about bulk discount.', status: 'Open', closingRemarks: '' },
];


const ChatPage = ({ setSelectedPage }) => {
    // --- State Management ---
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', or 'chat'

    // New Ticket State
    const [newTicketTopic, setNewTicketTopic] = useState('');
    const [newTicketSummary, setNewTicketSummary] = useState('');

    // Active Chat State
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    // Close Ticket Modal State
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [closingRemarks, setClosingRemarks] = useState('');

    // Refs and Config
    const stompClientRef = useRef(null);
    const usernameRefTemp = useRef('User_' + Math.floor(Math.random() * 1000)); // In a real app, this would come from auth context
    const [usernameRef, setUsernameRef] = useState(usernameRefTemp);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const messagesEndRef = useRef(null);

    // --- API Functions ---

    // 1. Fetch Latest Tickets
    const fetchTickets = async () => {
        setIsLoading(true);

        const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
            method: "GET",
            credentials: 'include',
        });
        if (!userRes.ok) throw new Error(`User session fetch failed (${userRes.status})`);

        const { username } = await userRes.json();

        setUsernameRef(username);


        console.log("Fetching latest tickets for user:", usernameRef);

        // REAL API CALL
        try {
            // No payload needed, username would be derived from the session/token on the backend
                const response = await fetch(`${apiUrl}/api/tickets/my-latest`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) throw new Error("Failed to fetch tickets");
            const data = await response.json();
            setTickets(data);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setIsLoading(false);
        }

        // EXPECTED SUCCESS RESPONSE (Array of tickets)
      /*  [
            {
                "ticketNumber": "TKT-78901",
                "creationDate": "2023-10-26T10:00:00Z",
                "topic": "Billings",
                "summary": "My last invoice seems incorrect.",
                "status": "Closed",
                "closingRemarks": "Resolved by support."
            },
            // ... more tickets
        ]*/

        // MOCK API CALL
      /*  setTimeout(() => {
            setTickets(mockTickets);
            setIsLoading(false);
        }, 1000);*/
    };
 console.log("The usernameRef that I got is", usernameRef);
    // 2. Create a New Ticket
    const createTicket = async () => {
        if (!newTicketTopic || !newTicketSummary) {
            alert("Please provide a topic and summary.");
            return;
        }

        // REQUEST PAYLOAD
        const payload = {
            "topic": newTicketTopic,
            "summary": newTicketSummary,
            "status": "Open" // Or handled by backend
        };

        // REAL API CALL
        try {
            const response = await fetch(`${apiUrl}/api/tickets/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to create ticket");
            const newTicketData = await response.json();
            return newTicketData;
        } catch (error) {
            console.error("Error creating ticket:", error);
            return null;
        }

        // EXPECTED SUCCESS RESPONSE (The newly created ticket object)
      /*  {
            "ticketNumber": "TKT-78904",
            "creationDate": "2023-10-29T14:00:00Z",
            "topic": "Customers",
            "summary": "How do I update my address?",
            "status": "Open",
            "closingRemarks": ""
        }*/

        // MOCK API CALL
        const newTicketData = {
            ticketNumber: `TKT-${Math.floor(Math.random() * 90000) + 10000}`,
            creationDate: new Date().toISOString(),
            topic: newTicketTopic,
            summary: newTicketSummary,
            status: 'Open',
            closingRemarks: ''
        };

        // Add to our local list and return
        setTickets(prev => [newTicketData, ...prev]);
        return newTicketData;
    };

    // 3. Close a Ticket
    const closeTicket = async () => {
        if (!closingRemarks) {
            alert("Please provide closing remarks.");
            return false;
        }

        // REQUEST PAYLOAD
        const payload = {
            "ticketNumber": activeTicket.ticketNumber,
            "status": "Closed",
            "closingRemarks": closingRemarks
        };

        // REAL API CALL
        try {
            const response = await fetch(`${apiUrl}/api/tickets/update`, {
                method: 'PUT', // Or POST
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Failed to close ticket");
            // const updatedTicket = await response.json();
            return true;
        } catch (error) {
            console.error("Error closing ticket:", error);
            return false;
        }

        // EXPECTED SUCCESS RESPONSE (The updated ticket or just a success status)
        /*{
            "ticketNumber": "TKT-78904",
            "status": "Closed",
            "closingRemarks": "I found the answer in the FAQ section."
        }*/

        // MOCK API CALL
        console.log("Closing ticket:", activeTicket.ticketNumber, "with remarks:", closingRemarks);
        return true;
    };


    // --- WebSocket Functions ---
    const connectToChat = (ticket) => {
        if (stompClientRef.current?.active || !apiUrl) return;

        // The chatId is now the unique ticket number
        const chatId = ticket.ticketNumber;
        setMessages([]);

        const onConnect = () => {
            console.log('User Connected for Ticket:', chatId);
            setIsConnected(true);

            // Subscribe to the private channel for this ticket
            stompClientRef.current.subscribe(`/topic/chat/${chatId}`, (payload) => {
                setMessages(prev => [...prev, JSON.parse(payload.body)]);
            });

            stompClientRef.current.publish({
                destination: '/app/chat.notifyAdmin',
                body: JSON.stringify({
                    sender: usernameRef,
                    chatId: chatId, // The ticket number
                    content: `Ticket Topic: ${ticket.topic}`, // A descriptive summary for the admin list
                    type: 'JOIN'
                })
            });

            // Announce to the admin that a user has started a chat for a ticket
            stompClientRef.current.publish({
                destination: '/app/chat.addUser',
                body: JSON.stringify({
                    sender: usernameRef,
                    chatId: chatId, // The ticket number
                    content: `User opened chat for ticket about "${ticket.topic}"`,
                    type: 'JOIN'
                })
            });

            // Also send the ticket summary as the first message from the user
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify({
                    sender: usernameRef,
                    content: `Ticket Summary: ${ticket.summary}`,
                    chatId: chatId,
                    type: 'CHAT'
                })
            });
        };

        const getWebSocketUrl = (url) => {
            try { return `${new URL(url).origin}/ws`; } catch (e) { return ''; }
        };
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
            const chatMessage = {
                sender: usernameRef,
                content: inputValue,
                chatId: activeTicket.ticketNumber,
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(chatMessage)
            });
            setInputValue('');
        }
    };


    // --- Handlers ---
    const handleCreateTicket = async () => {
        const newTicket = await createTicket();
        if (newTicket) {
            setActiveTicket(newTicket);
            setView('chat'); // Switch to the chat view
            connectToChat(newTicket);
        }
    };

    const handleCloseTicket = async () => {
        const success = await closeTicket();
        if (success) {
            setIsCloseModalOpen(false);
            if (stompClientRef.current?.active) {
                stompClientRef.current.deactivate();
            }
            // Navigate to dashboard as requested
            setSelectedPage('dashboard');
        }
    };


    // --- Effects ---
    useEffect(() => {
        fetchTickets();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        // Disconnect WebSocket when leaving the chat view
        return () => {
            if (stompClientRef.current?.active) {
                stompClientRef.current.deactivate();
            }
        };
    }, []);

    // --- Render Logic ---
    if (view === 'chat') {
        return (
            <div className="chat-window-page">
                <div className="chat-header">
                    <span>Ticket: {activeTicket.ticketNumber} ({activeTicket.topic})</span>
                    <button className="close-btn-link" onClick={() => setIsCloseModalOpen(true)}>
                        Close Ticket
                    </button>
                </div>
                <div className="messages-list">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message-item ${msg.sender === usernameRef ? 'user' : 'admin'}`}>
                            {msg.content}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form className="message-input-form" onSubmit={sendMessage}>
                    <input type="text" placeholder={isConnected ? "Type a message..." : "Connecting..."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} disabled={!isConnected} autoFocus />
                    <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                </form>

                {isCloseModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Close Ticket {activeTicket.ticketNumber}</h3>
                            <p>Please provide a reason for closing this ticket.</p>
                            <textarea
                                placeholder="Closing remarks..."
                                value={closingRemarks}
                                onChange={(e) => setClosingRemarks(e.target.value)}
                            />
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setIsCloseModalOpen(false)}>Cancel</button>
                                <button className="btn" onClick={handleCloseTicket}>Submit & Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'create') {
        return (
            <div className="topic-selection-container glass-card">
                <button className="back-link-button" onClick={() => setView('list')}><FaArrowLeft /> Back to Tickets</button>
                <h2>Create New Support Ticket</h2>
                <div className="form-group">
                    <label>Topic</label>
                    <select value={newTicketTopic} onChange={(e) => setNewTicketTopic(e.target.value)}>
                        <option value="">-- Select a Topic --</option>
                        <option value="Product">Product</option>
                        <option value="Customers">Customers</option>
                        <option value="Sales">Sales</option>
                        <option value="Billings">Billings</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Summary</label>
                    <textarea
                        placeholder="Briefly describe your issue..."
                        value={newTicketSummary}
                        onChange={(e) => setNewTicketSummary(e.target.value)}
                    />
                </div>
                <div className="form-actions">
                    <button className="btn" onClick={handleCreateTicket}>
                        Save & Start Chat
                    </button>
                </div>
            </div>
        )
    }

    // Default view: 'list'
    return (
        <div className="ticket-list-container">
            <div className="ticket-list-header">
                <h2>My Support Tickets</h2>
                <button className="btn" onClick={() => setView('create')}>
                    <FaPlus /> Create New Ticket
                </button>
            </div>
            {isLoading ? <p>Loading tickets...</p> : (
                <div className="tickets-table-wrapper">
                    <table className="beautiful-table tickets-table">
                        <thead>
                        <tr>
                            <th>Ticket #</th>
                            <th>Created On</th>
                            <th>Topic</th>
                            <th>Summary</th>
                            <th>Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {tickets.map(ticket => (
                            <tr key={ticket.ticketNumber}>
                                <td>{ticket.ticketNumber}</td>
                                <td>{new Date(ticket.createdDate).toLocaleDateString()}</td>
                                <td>{ticket.topic}</td>
                                <td>{ticket.summary}</td>
                                <td>
                                        <span className={`status-badge status-${ticket.status.toLowerCase()}`}>
                                            {ticket.status}
                                        </span>
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