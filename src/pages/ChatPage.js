import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider"; // Corrected path
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './AdminChatPage.css'; // We can reuse the admin CSS
import './ChatPage.css';       // And the user CSS

const ChatPage = ({ user }) => {
    // Determine the user's role once
    const isAdmin = user?.roles?.includes('ADMIN') ?? false;
    const username = user?.username || 'Guest';

    // This component will now internally decide which UI to render
    if (isAdmin) {
        return <AdminUI adminUsername={username} />;
    } else {
        return <UserUI username={username} />;
    }
};

// --- Admin Component Logic ---
const AdminUI = ({ adminUsername }) => {
    const [activeChats, setActiveChats] = useState(new Map());
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const stompClientRef = useRef(null);
    const subscriptionsRef = useRef(new Map());
    const messagesEndRef = useRef(null);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    useEffect(() => {
        if (!apiUrl) return;

        const onConnect = () => {
            console.log('Admin connected to WebSocket');
            setIsConnected(true);
            stompClientRef.current.subscribe('/topic/admin/new-chats', onNewChatNotification);
        };

        const onError = (err) => console.error("Admin STOMP Error", err);
        const getWebSocketUrl = (url) => {
            try { return `${new URL(url).origin}/ws`; } catch (e) { return ''; }
        };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return;

        stompClientRef.current = new Client({
            webSocketFactory: () => new SockJS(webSocketUrl),
            onConnect,
            onStompError: onError,
            onDisconnect: () => setIsConnected(false),
            reconnectDelay: 5000,
        });

        stompClientRef.current.activate();

        return () => { if (stompClientRef.current?.active) { stompClientRef.current.deactivate(); }};
    }, [apiUrl]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (selectedChatId && activeChats.has(selectedChatId)) {
            setMessages(activeChats.get(selectedChatId).messages);
        }
    }, [selectedChatId, activeChats]);

    const onNewChatNotification = (payload) => {
        const notification = JSON.parse(payload.body);
        setActiveChats(prev => {
            const newChats = new Map(prev);
            if (!newChats.has(notification.chatId)) {
                newChats.set(notification.chatId, { ...notification, messages: [], unread: true });
            }
            return newChats;
        });

        if (stompClientRef.current?.active && !subscriptionsRef.current.has(notification.chatId)) {
            const sub = stompClientRef.current.subscribe(`/topic/chat/${notification.chatId}`, onMessageReceived);
            subscriptionsRef.current.set(notification.chatId, sub);
        }
    };

    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);
        setActiveChats(prev => {
            const newChats = new Map(prev);
            const chat = newChats.get(message.chatId);
            if (chat) {
                const updatedMessages = [...chat.messages, message];
                const isUnread = message.sender !== adminUsername && message.chatId !== selectedChatId;
                newChats.set(message.chatId, { ...chat, messages: updatedMessages, unread: chat.unread || isUnread });
            }
            return newChats;
        });
    };

    const selectChat = (chatId) => {
        setSelectedChatId(chatId);
        setActiveChats(prev => {
            const newChats = new Map(prev);
            const chat = newChats.get(chatId);
            if (chat && chat.unread) {
                newChats.set(chatId, { ...chat, unread: false });
            }
            return newChats;
        });
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() && selectedChatId && isConnected) {
            const msg = { sender: adminUsername, content: inputValue, chatId: selectedChatId, type: 'CHAT' };
            stompClientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify(msg) });
            setInputValue('');
        }
    };

    const currentChat = selectedChatId ? activeChats.get(selectedChatId) : null;

    return (
        <div className="admin-chat-dashboard">
            <div className="adminChat">
                <div className="adminChat-header"><h3>Active Chats {!isConnected && '(Offline)'}</h3></div>
                <div className="chat-list">
                    {Array.from(activeChats.values()).map(chat => (
                        <div key={chat.chatId} className={`chat-list-item ${chat.chatId === selectedChatId ? 'selected' : ''} ${chat.unread ? 'unread' : ''}`} onClick={() => selectChat(chat.chatId)}>
                            <div className="chat-item-user">{chat.sender}</div>
                            <div className="chat-item-topic">{chat.content}</div>
                        </div>
                    ))}
                    {activeChats.size === 0 && <p className="no-chats">Waiting for users...</p>}
                </div>
            </div>
            <div className="chat-area">
                {selectedChatId ? (
                    <>
                        <div className="chat-area-header"><h4>Chat with {currentChat?.sender}</h4></div>
                        <div className="messages-list">
                            {messages.map((msg, i) => (
                                <div key={i} className={`message-item ${msg.sender === adminUsername ? 'user' : 'admin'}`}>{msg.content}</div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className="message-input-form" onSubmit={sendMessage}>
                            <input type="text" placeholder={isConnected ? "Type your reply..." : "Connecting..."} value={inputValue} onChange={e => setInputValue(e.target.value)} disabled={!isConnected} autoFocus />
                            <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                        </form>
                    </>
                ) : (<div className="no-chat-selected"><p>Select a chat from the left to start viewing messages.</p></div>)}
            </div>
        </div>
    );
};

// --- User Component Logic ---
const UserUI = ({ username }) => {
    const [topic, setTopic] = useState('');
    const [isChatStarted, setIsChatStarted] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const stompClientRef = useRef(null);
    const chatIdRef = useRef(null);
    const messagesEndRef = useRef(null);
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => { if (stompClientRef.current?.active) { stompClientRef.current.deactivate(); }};
    }, []);

    useEffect(() => {
        if (isChatStarted) {
            connectToChat();
        }
    }, [isChatStarted]);

    const connectToChat = () => {
        if (stompClientRef.current?.active || !apiUrl) return;
        chatIdRef.current = `${username}-${topic}-${Date.now()}`;

        const onConnect = () => {
            setIsConnected(true);
            stompClientRef.current.subscribe(`/topic/chat/${chatIdRef.current}`, (payload) => setMessages(prev => [...prev, JSON.parse(payload.body)]));
            stompClientRef.current.publish({ destination: '/app/chat.addUser', body: JSON.stringify({ sender: username, chatId: chatIdRef.current, type: 'JOIN' }) });
            stompClientRef.current.publish({ destination: '/app/chat.notifyAdmin', body: JSON.stringify({ sender: username, chatId: chatIdRef.current, content: `Topic: ${topic}`, type: 'JOIN' }) });
        };

        const getWebSocketUrl = (url) => {
            try { return `${new URL(url).origin}/ws`; } catch (e) { return ''; }
        };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return;

        stompClientRef.current = new Client({ webSocketFactory: () => new SockJS(webSocketUrl), onConnect, reconnectDelay: 5000 });
        stompClientRef.current.activate();
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() && isConnected) {
            const msg = { sender: username, content: inputValue, chatId: chatIdRef.current, type: 'CHAT' };
            stompClientRef.current.publish({ destination: '/app/chat.sendMessage', body: JSON.stringify(msg) });
            setInputValue('');
        }
    };

    if (!isChatStarted) {
        return (
            <div className="topic-selection-container glass-card">
                <Link to="/" className="back-link"><FaArrowLeft /> Back to Dashboard</Link>
                <h2>Contact Support</h2>
                <p>Please select a topic for your issue:</p>
                <div className="form-group">
                    <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                        <option value="">-- Select a Topic --</option>
                        <option value="Product">Product</option>
                        <option value="Customers">Customers</option>
                        <option value="Sales">Sales</option>
                        <option value="Billings">Billings</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button className="btn" onClick={() => { if (topic) setIsChatStarted(true); else alert("Please select a topic."); }}>Start Chat</button>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window-page">
            <div className="chat-header"><span>Support Topic: {topic} {!isConnected && '(Connecting...)'}</span><Link to="/" className="close-btn-link">End Chat</Link></div>
            <div className="messages-list">
                {messages.map((msg, i) => (
                    <div key={i} className={`message-item ${msg.sender === username ? 'user' : 'admin'}`}>{msg.content}</div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="message-input-form" onSubmit={sendMessage}>
                <input type="text" placeholder={isConnected ? "Type a message..." : "Connecting..."} value={inputValue} onChange={e => setInputValue(e.target.value)} disabled={!isConnected} autoFocus />
                <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
            </form>
        </div>
    );
};

export default ChatPage;