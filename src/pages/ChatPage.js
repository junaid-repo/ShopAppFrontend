import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useConfig } from "./ConfigProvider";
import { Link } from 'react-router-dom';
import './ChatPage.css';

const ChatPage = () => {
    const [topic, setTopic] = useState('');
    const [isChatStarted, setIsChatStarted] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const stompClientRef = useRef(null);
    const usernameRef = useRef('User_' + Math.floor(Math.random() * 1000));
    const chatIdRef = useRef(null);

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        // This function will run when the component unmounts
        return () => {
            if (stompClientRef.current?.active) {
                console.log("Disconnecting STOMP client on page unload...");
                stompClientRef.current.deactivate();
            }
        };
    }, []);

    const handleStartChat = () => {
        if (!topic) {
            alert("Please select a topic.");
            return;
        }
        setIsChatStarted(true);
    };

    // Use an effect to connect only after the chat UI is rendered
    useEffect(() => {
        if (isChatStarted) {
            connectToChat();
        }
    }, [isChatStarted]);

    const connectToChat = () => {
        if (stompClientRef.current?.active || !apiUrl) return;

        chatIdRef.current = `${usernameRef.current}-${topic}-${Date.now()}`;
        setMessages([]);

        const onConnect = (frame) => {
            console.log('User Connected: ' + frame);
            setIsConnected(true);

            stompClientRef.current.subscribe(`/topic/chat/${chatIdRef.current}`, onMessageReceived);

            stompClientRef.current.publish({
                destination: '/app/chat.addUser',
                body: JSON.stringify({ sender: usernameRef.current, chatId: chatIdRef.current, type: 'JOIN' })
            });

            stompClientRef.current.publish({
                destination: '/app/chat.notifyAdmin',
                body: JSON.stringify({
                    sender: usernameRef.current,
                    chatId: chatIdRef.current,
                    content: `New chat started for topic: ${topic}`,
                    type: 'JOIN'
                })
            });
        };

        const onError = (error) => {
            console.error('STOMP connection error:', error);
            setIsConnected(false);
        };

        // --- THIS IS THE KEY FIX ---
        // Derives the base URL (e.g., http://localhost:8080) from your full API URL
        const getWebSocketUrl = (url) => {
            try {
                const serverUrl = new URL(url);
                return `${serverUrl.origin}/ws`; // Correctly points to the root endpoint
            } catch (e) {
                console.error("Invalid API_URL for WebSocket:", url);
                return '';
            }
        };
        const webSocketUrl = getWebSocketUrl(apiUrl);
        if (!webSocketUrl) return; // Don't try to connect if URL is invalid

        stompClientRef.current = new Client({
            webSocketFactory: () => new SockJS(webSocketUrl),
            onConnect,
            onStompError: onError,
            onDisconnect: () => setIsConnected(false),
            reconnectDelay: 5000,
        });

        stompClientRef.current.activate();
    };

    const onMessageReceived = (payload) => {
        const message = JSON.parse(payload.body);
        setMessages(prev => [...prev, message]);
    };

    const sendMessage = (event) => {
        event.preventDefault();
        if (inputValue.trim() && stompClientRef.current?.active && isConnected) {
            const chatMessage = {
                sender: usernameRef.current,
                content: inputValue,
                chatId: chatIdRef.current,
                type: 'CHAT'
            };
            stompClientRef.current.publish({
                destination: '/app/chat.sendMessage',
                body: JSON.stringify(chatMessage)
            });
            setInputValue('');
        } else {
            console.error("Cannot send message, client is not connected.");
        }
    };

    return (
        <div className="chat-page-container">
            {!isChatStarted ? (
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
                        <button className="btn" onClick={handleStartChat}>Start Chat</button>
                    </div>
                </div>
            ) : (
                <div className="chat-window-page">
                    <div className="chat-header">
                        <span>Support Topic: {topic} {!isConnected && '(Connecting...)'}</span>
                        <Link to="/" className="close-btn-link">End Chat</Link>
                    </div>
                    <div className="messages-list">
                        {messages.map((msg, index) => {
                            if (msg.type === 'JOIN') {
                                return <div key={index} className="message-item event">{msg.sender} joined</div>;
                            }
                            const isCurrentUser = msg.sender === usernameRef.current;
                            return (
                                <div key={index} className={`message-item ${isCurrentUser ? 'user' : 'admin'}`}>
                                    {msg.content}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="message-input-form" onSubmit={sendMessage}>
                        <input
                            type="text"
                            placeholder={isConnected ? "Type a message..." : "Connecting to chat..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={!isConnected}
                            autoFocus
                        />
                        <button type="submit" disabled={!isConnected}><FaPaperPlane /></button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatPage;