import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const Session = () => {
    const { sessionId } = useParams();
    const [stream, setStream] = useState(null);
    const [isCreator, setIsCreator] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef();
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;
    const peerRef = useRef(null); // Define peerRef here

    useEffect(() => {
        const initSocket = () => {
            socketRef.current = io('http://localhost:5000');
            
            socketRef.current.on('offer', handleReceiveOffer);
            socketRef.current.on('answer', handleReceiveAnswer);
            socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
            socketRef.current.on('end-call', handleEndCall);
            socketRef.current.on('chat-message', handleReceiveMessage);
            socketRef.current.on('client-update', handleClientUpdate);

            const id = uuidv4();
            setClientId(id);
            
            socketRef.current.emit('join-session', { sessionId, clientId: id });

            // Fetch session data to determine if the current user is the creator
            fetch(`/api/sessions/${sessionId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.creatorId === id) {
                        setIsCreator(true);
                    }
                })
                .catch(error => console.error('Error fetching session data:', error));
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
            await peerRef.current.addIceCandidate(new RTCIceCandidate(msg));
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

        peerRef.current = peer; // Assign peer to peerRef.current
    };

    const handleStartCall = async () => {
        createPeer();
        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);
        socketRef.current.emit('offer', { sessionId, offer });
    };

    const handleEndCall = () => {
        if (peerRef.current) {
            peerRef.current.close();
        }
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setStream(null);
        alert('Call ended by the host');
    };

    const handleLeaveCall = () => {
        if (peerRef.current) {
            peerRef.current.close();
        }
        socketRef.current.emit('leave-call', { sessionId });
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setStream(null);
        alert('You have left the call');
    };

    const handleSendMessage = () => {
        if (newMessage.trim() === '') return;

        const messageData = {
            sender: clientId,
            message: newMessage.trim(),
        };

        socketRef.current.emit('chat-message', { sessionId, ...messageData });
        setNewMessage(''); // Clear input field after sending message
    };

    const handleReceiveMessage = (messageData) => {
        setMessages((prevMessages) => [...prevMessages, messageData]);
    };

    const handleClientUpdate = (updatedClients) => {
        setClients(updatedClients);
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-gray-100">
            {/* Video Call Section */}
            <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
                <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
                <div className="flex flex-col items-center">
                    <div>
                        <strong>Admin:</strong> {clients.find(client => client.isCreator)?.id}
                    </div>
                    <video ref={localVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
                    <div className="flex flex-col items-center">
                        {clients.filter(client => client.id !== clientId).map(client => (
                            <div key={client.id}>
                                <strong>Client:</strong> {client.id}
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
                    className="bg-green-500 text-white py-2 px-4 rounded w-full mb-4"
                >
                    Copy Session URL
                </button>
                {isCreator ? (
                    <button
                        onClick={handleEndCall}
                        className="bg-red-500 text-white py-2 px-4 rounded w-full"
                    >
                        End Call
                    </button>
                ) : (
                    <button
                        onClick={handleLeaveCall}
                        className="bg-red-500 text-white py-2 px-4 rounded w-full"
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
                                msg.sender === clientId ? 'ml-auto' : 'mr-auto'
                            } flex-col gap-2 rounded-xl p-4 ${
                                msg.sender === clientId
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
