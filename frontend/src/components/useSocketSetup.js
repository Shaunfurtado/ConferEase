import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const useSocketSetup = (sessionId, nickname) => {
    const socketRef = useRef();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        const serverUrl = import.meta.env.VITE_SERVER_URL;
        socketRef.current = io(serverUrl);

        socketRef.current.on('chat-message', handleReceiveMessage);
        socketRef.current.on('session-full', handleSessionFull);
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [sessionId]);

    const handleReceiveMessage = (messageData) => {
        setMessages((prevMessages) => [...prevMessages, messageData]);
    };


    const handleSessionFull = () => {
        alert('This session is full. Cannot join.');
        window.location.href = '/';
        window.location.reload();
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