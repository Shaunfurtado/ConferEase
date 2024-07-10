import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import useSocketSetup from '../components/useSocketSetup';
import useWebRTC from '../components/useWebRTC';
import ChatComponent from '../components/ChatComponent';
import NicknameModal from '../components/NicknameModal';

const Session = () => {
    const { sessionId } = useParams();
    const location = useLocation();
    const [nickname, setNickname] = useState(location.state?.nickname || '');
    const [isModalOpen, setIsModalOpen] = useState(!location.state?.nickname);
    const [isCreator, setIsCreator] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState([]);
    const [sessionStatus, setSessionStatus] = useState('active');
    const [localStream, setLocalStream] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;


    const { socketRef, messages, setMessages, newMessage, setNewMessage, handleSendMessage } = useSocketSetup(sessionId, nickname, clientId);
    const { peerRef, remoteStream, handleStartCall, handleEndCall, handleLeaveCall } = useWebRTC(socketRef, sessionId, clientId, localStream);

    useEffect(() => {
        const initSession = async () => {
            const id = location.state?.userId || uuidv4();
            setClientId(id);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing media devices.', error);
            }
        };

        initSession();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [location.state]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        if (nickname && clientId) {
            joinSession();
        }
    }, [nickname, clientId]);

    useEffect(() => {
        const checkSessionStatus = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}/status`);
                if (response.data.status === 'expired') {
                    alert('This session has expired.');
                }
            } catch (error) {
                console.error('Error checking session status:', error);
            }
        };
    
        checkSessionStatus();
    
        if (socketRef.current) {
            socketRef.current.on('session-status', (status) => {
                if (status === 'expired') {
                    alert('This session has expired.');
                }
            });
        }
    }, [sessionId, socketRef]);

    const joinSession = async () => {
        try {
            socketRef.current.emit('join-session', { sessionId, clientId, nickname }, (response) => {
                if (response.success) {
                    setIsModalOpen(false);
                    setIsCreator(response.isCreator);
                } else {
                    alert(response.message);
                    window.location.href = '/';
                }
            });
        } catch (error) {
            console.error('Error joining session:', error);
            alert('Error joining session. Please try again.');
        }
    };

    const handleCopyUrl = () => {
        const joinUrl = `${sessionUrl}`;
        const message = `Join this session: ${joinUrl}`;
        const data = `${nickname} has invited you to join the session.\n\n Session ID is : ${sessionId}\n\n${message}`;
        navigator.clipboard.writeText(data);
        alert('Session URL copied to clipboard');
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-gray-100">
            <NicknameModal 
                isOpen={isModalOpen} 
                setIsOpen={setIsModalOpen}
                nickname={nickname}
                setNickname={setNickname}
                joinSession={joinSession}
            />

            {/* Video Call Section */}
            <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
                <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
                <div className="flex flex-col items-center space-y-4">
                    {/* Local Video */}
                    <div className="w-full">
                        <div className="text-lg font-semibold mb-2">
                            {nickname} (You)
                        </div>
                        <video 
                            ref={localVideoRef}
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full aspect-video object-cover border rounded"
                        ></video>
                    </div>
                    
                    {/* Remote Video */}
                    <div className="w-full">
                        <div className="text-lg font-semibold mb-2">
                            Remote User
                        </div>
                        <video 
                            ref={remoteVideoRef}
                            autoPlay 
                            playsInline 
                            className="w-full aspect-video object-cover border rounded"
                        ></video>
                    </div>
                </div>
                
                <div className="mt-6 space-y-4">
                    <button 
                        onClick={handleStartCall} 
                        className="bg-blue-500 text-white py-2 px-4 rounded w-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    >
                        Start Call
                    </button>
                    <button 
                        onClick={handleCopyUrl} 
                        className="bg-green-500 text-white py-2 px-4 rounded w-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                    >
                        Copy Session URL
                    </button>
                    {isCreator ? (
                        <button 
                            onClick={handleEndCall} 
                            className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                        >
                            End Call
                        </button>
                    ) : (
                        <button 
                            onClick={handleLeaveCall} 
                            className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                        >
                            Leave Call
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Section */}
            <ChatComponent 
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                nickname={nickname}
            />
        </div>
    );
};

export default Session;