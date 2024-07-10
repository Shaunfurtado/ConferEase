import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const useSocketSetup = (sessionId, nickname, clientId) => {
    const socketRef = useRef();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
        
        socketRef.current.on('chat-message', handleReceiveMessage);
        socketRef.current.on('client-update', handleClientUpdate);
        socketRef.current.on('session-status', handleSessionStatus);
        socketRef.current.on('session-full', handleSessionFull);
        socketRef.current.on('creator-set', handleCreatorSet);

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [sessionId]);

    const handleReceiveMessage = (messageData) => {
        setMessages((prevMessages) => [...prevMessages, messageData]);
    };

    const handleClientUpdate = (updatedClients) => {
        // Handle client update
    };

    const handleSessionStatus = (status) => {
        // Handle session status update
    };

    const handleSessionFull = () => {
        alert('This session is full. Cannot join.');
        window.location.href = '/';
    };

    const handleCreatorSet = (creatorId) => {
        // Handle creator set
    };

    const handleSendMessage = () => {
        if (newMessage.trim() === '') return;

        const messageData = {
            sender: nickname,
            message: newMessage.trim(),
        };

        socketRef.current.emit('chat-message', { sessionId, ...messageData });
        setNewMessage('');
    };

    return { socketRef, messages, setMessages, newMessage, setNewMessage, handleSendMessage };
};

export default useSocketSetup;