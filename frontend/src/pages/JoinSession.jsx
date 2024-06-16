import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const JoinSession = () => {
    const { sessionId } = useParams();
    const [nickname, setNickname] = useState('');
    const [isNicknameSet, setIsNicknameSet] = useState(false);
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
    }, []);

    const handleJoinSession = () => {
        if (nickname) {
            socketRef.current.emit('joinSession', { sessionId, nickname });
            setIsNicknameSet(true);
        }
    };

    if (!isNicknameSet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <h1 className="text-3xl font-bold mb-6">Join Session {sessionId}</h1>
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
                    className="p-2 border border-gray-300 rounded mb-4"
                />
                <button
                    onClick={handleJoinSession}
                    className="bg-blue-500 text-white p-2 rounded"
                >
                    Join Session
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-6">Welcome, {nickname}</h1>
            <p>You have joined the session {sessionId}</p>
        </div>
    );
};

export default JoinSession;
