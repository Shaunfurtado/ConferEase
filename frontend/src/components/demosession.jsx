import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Modal from 'react-modal';
import { IoMdSend } from "react-icons/io";

const Session = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
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
        navigate('/'); // Redirect to homepage
        
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
            Object.values(peerRef.current).forEach(peer => peer.close());
        }
        socketRef.current.emit('leave-call', { sessionId });
        localVideoRef.current.srcObject = null;
        setStream(null);
        setIsCreator(false); // Reset creator state after leaving call
        navigate('/'); // Redirect to homepage
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
        <div className="flex h-screen bg-gray-100">
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
            <div className="w-3/4 p-6 bg-white rounded shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-center mb-4">
                        <video ref={localVideoRef} autoPlay playsInline className="w-full border rounded-lg"></video>
                    </div>
                    {clients.map(client => (
                        <div key={client.clientId} className="flex flex-col items-center mb-4">
                            <strong>Client:</strong> {client.nickname}
                            <div className="flex justify-center">
                                {/* Use conditional rendering to show remote video only if client is not the local user */}
                                {client.clientId !== clientId && (
                                    <video id={`remote-video-${client.clientId}`} autoPlay playsInline className="w-full border rounded-lg"></video>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleStartCall}
                    className="bg-blue-500 text-white py-2 px-4 rounded w-1/5 mb-4"
                >
                    Start Call
                </button>
                <button
                    onClick={handleCopyUrl}
                    className="bg-green-500 text-white py-2 px-4 rounded w-1/5 mb-4"
                >
                    Copy Session URL
                </button>
                <button
                    onClick={handleEndCall}
                    className="bg-red-500 text-white py-2 px-4 rounded w-1/5 mb-4"
                >
                    End Call
                </button>
                <button
                    onClick={handleLeaveCall}
                    className="bg-gray-500 text-white py-2 px-4 rounded w-1/5 mb-4"
                >
                    Leave Call
                </button>
            </div>

            {/* Chat Section */}
            <div className="w-1/4 flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden">
                <header className="bg-primary text-primary-foreground py-4 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="relative flex-shrink-0 overflow-hidden rounded-full w-10 h-10">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">CB</span>
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold">{sessionId}</h2>
                            <p className="text-sm text-muted-foreground">{clients.length} participants</p>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm ${
                                msg.sender === nickname ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                        >
                            <p>{msg.message}</p>
                            <div className="text-xs text-muted-foreground">
                                <span>{msg.sender}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="bg-muted/40 px-6 py-4">
                    <form className="flex items-center w-full space-x-2 py-6">
                        <input
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1"
                            id="message"
                            placeholder="Type your message..."
                            autoComplete="off"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10"
                            type="button"
                            onClick={handleSendMessage}
                        >
                            <IoMdSend />
                            <span className="sr-only">Send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
    
};

export default Session;