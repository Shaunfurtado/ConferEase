import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Modal from 'react-modal';

const Session = () => {
    const { sessionId } = useParams();
    const [nickname, setNickname] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [stream, setStream] = useState(null);
    const [isCreator, setIsCreator] = useState(false); // State to track if current client is the creator
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [creatorNickname, setCreatorNickname] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef();
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;
    const peerRef = useRef(null);

    useEffect(() => {
        const initSocket = () => {
            socketRef.current = io('http://localhost:5000');
            
            socketRef.current.on('offer', handleReceiveOffer);
            socketRef.current.on('answer', handleReceiveAnswer);
            socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
            socketRef.current.on('end-call', handleEndCall); // Add event listener
            socketRef.current.on('chat-message', handleReceiveMessage);
            socketRef.current.on('client-update', handleClientUpdate);
            socketRef.current.on('client-joined', handleClientJoined); // Add event listener for client joining

            const id = uuidv4();
            setClientId(id);
            console.log(`Client ID initialized: ${id}`);
        };

        const startStream = async () => {
            try {
                const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(localStream);
                localVideoRef.current.srcObject = localStream;
            } catch (error) {
                console.error('Error accessing media devices.', error);
            }
        };

        initSocket();
        startStream();

        return () => {
            socketRef.current.disconnect();
        };
    }, [sessionId]);

    useEffect(() => {
        if (clientId) {
            console.log(`Fetching session data for session: ${sessionId}, clientId: ${clientId}`);
            fetch(`/api/sessions/${sessionId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                    
                })
                .then(data => {
                    console.log(data);
                    console.log(`Fetched session data: `, data);
                    setCreatorNickname(data.creatorNickname);
                    console.log(`Nickname of the creator: ${data.creatorNickname}`);
                    console.log(`Current client ID: ${clientId}`);
                    console.log(`Creator ID: ${data.creatorId}`);
                    if (data.creatorId === clientId) {
                        console.log("This client is the creator of the session.");
                        setIsCreator(true);
                    } else {
                        console.log("This client is not the creator of the session.");
                    }
                })
                .catch(error => {
                    console.error('Error fetching session data:', error);
                    // Handle error state or display a message to the user
                });
        }
    }, [clientId, sessionId]);

    const handleReceiveOffer = async (offer) => {
        if (!peerRef.current) createPeer();
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        socketRef.current.emit('answer', { sessionId, answer });
    };

    const handleReceiveAnswer = async (answer) => {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleNewICECandidateMsg = async (msg) => {
        try {
            if (!peerRef.current) {
                createPeer();
            }
            const candidate = new RTCIceCandidate(msg);
            await peerRef.current.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error adding received ice candidate', error);
        }
    };
    
    const createPeer = () => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
            ],
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', { sessionId, candidate: event.candidate });
            }
        };

        peer.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        stream.getTracks().forEach(track => peer.addTrack(track, stream));

        peerRef.current = peer;
    };

    const handleStartCall = async () => {
        createPeer();
        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', { sessionId, offer });
    };

    const handleEndCall = async () => {
        console.log("Ending call...");
        if (peerRef.current) {
            peerRef.current.close();
        }
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setStream(null);
        
        try {
            const response = await fetch('/api/sessions/end-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId, userId: clientId }), // Adjust userId or clientId as needed
            });
    
            if (!response.ok) {
                throw new Error('Failed to end call');
            }
    
            setIsCreator(false); // Reset creator state after ending call
            console.log(`${creatorNickname} has ended the call.`);
        } catch (error) {
            console.error('Error ending call:', error);
            // Handle error state or display a message to the user
        }
    };

    const handleLeaveCall = () => {
        console.log("Leaving call...");
        if (peerRef.current) {
            peerRef.current.close();
        }
        socketRef.current.emit('leave-call', { sessionId });
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setStream(null);
        setIsCreator(false); // Reset creator state after leaving call
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

    const handleReceiveMessage = (messageData) => {
        setMessages((prevMessages) => [...prevMessages, messageData]);
    };

    const handleClientUpdate = (updatedClients) => {
        setClients(updatedClients);
    };

    const handleClientJoined = (clientInfo) => {
        console.log(`Client joined: ID=${clientInfo.clientId}, Creator ID=${clientInfo.creatorId}`);
        setClients((prevClients) => [...prevClients, clientInfo]);
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    const joinSession = async () => {
        socketRef.current.emit('join-session', { sessionId, clientId, nickname });
    
        setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-gray-100">
            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                contentLabel="Enter Nickname"
                ariaHideApp={false}
            >
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl mb-4">Enter your nickname</h2>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Nickname"
                        className="p-2 border border-gray-300 rounded mb-4"
                    />
                    <button
                        onClick={joinSession}
                        className="bg-blue-500 text-white py-2 px-4 rounded"
                    >
                        Join Session
                    </button>
                </div>
            </Modal>

            {/* Video Call Section */}
            <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
                <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
                <div className="flex flex-col items-center">
                    <div>
                        <strong>Admin:</strong> {creatorNickname}
                    </div>
                    <video ref={localVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
                    <div className="flex flex-col items-center">
                        {clients.filter(client => client.clientId !== clientId).map(client => (
                            <div key={client.clientId}>
                                <strong>Client:</strong> {client.nickname}
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleStartCall}
                    className="bg-blue-500 text-white py-2 px-4 rounded w-full mb-4"
                >
                    Start Call
                </button>
                <button
                    onClick={handleCopyUrl}
                    className
                    ="bg-green-500 text-white py-2 px-4 rounded w-full mb-4"
                >
                    Copy Session URL
                </button>
                {isCreator && (
                    <button
                        onClick={handleEndCall}
                        className="bg-red-500 text-white py-2 px-4 rounded w-full mb-4"
                    >
                        End Call
                    </button>
                )}
                {!isCreator && (
                    <button
                        onClick={handleLeaveCall}
                        className="bg-gray-500 text-white py-2 px-4 rounded w-full mb-4"
                    >
                        Leave Call
                    </button>
                )}
            </div>

            {/* Chat Section */}
            <div className="bg-gray-100 p-4 rounded shadow-md w-full md:w-1/4 max-w-md">
                <h2 className="text-xl font-bold mb-4">Chat</h2>
                <div className="flex w-full flex-col gap-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex max-w-[80%] ${
                                msg.sender === nickname ? 'ml-auto' : 'mr-auto'
                            } flex-col gap-2 rounded-xl p-4 ${
                                msg.sender === nickname
                                    ? 'bg-blue-700 text-slate-100 dark:bg-blue-600 dark:text-slate-100'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            <span className="font-semibold text-black dark:text-white">
                                {msg.sender}
                            </span>
                            <div className="text-sm">
                                {msg.message}
                            </div>
                        </div>
                    ))}
                    <div className="mt-4 flex items-center space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="p-2 border border-gray-300 rounded w-full"
                        />
                        <button
                            onClick={handleSendMessage}
                            className="bg-blue-500 text-white p-2 rounded"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Session;
