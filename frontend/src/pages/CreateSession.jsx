import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating user IDs
import io from 'socket.io-client';

const CreateSession = () => {
    const [nickname, setNickname] = useState('');
    const [sessionUrl, setSessionUrl] = useState('');
    const navigate = useNavigate();
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
    }, []);

    const handleCreateSession = async () => {
        try {
            const userId = uuidv4(); // Generate a unique userId for each client
            const response = await axios.post('http://localhost:5000/api/sessions/create-session', { nickname, userId });
            const sessionId = response.data.sessionId;
            const url = `${window.location.origin}/session/${sessionId}`;
            setSessionUrl(url);
            navigate(`/session/${sessionId}`);
        } catch (error) {
            console.error('Error creating session', error);
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-6">Create a Session</h1>
            <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="p-2 border border-gray-300 rounded mb-4"
            />
            <button
                onClick={handleCreateSession}
                className="bg-blue-500 text-white p-2 rounded mb-4"
            >
                Create Session
            </button>
            
            {sessionUrl && (
                <div className="flex flex-col items-center mt-4">
                    <p className="mb-2">Share this URL to join the session:</p>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={sessionUrl}
                            readOnly
                            className="p-2 border border-gray-300 rounded w-full"
                        />
                        <button
                            onClick={handleCopyUrl}
                            className="bg-green-500 text-white p-2 rounded"
                        >
                            Copy URL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateSession;
