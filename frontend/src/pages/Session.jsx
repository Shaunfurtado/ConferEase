import { useEffect, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import * as Dialog from '@radix-ui/react-dialog';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Cross2Icon } from '@radix-ui/react-icons';

const Session = () => {
    const { sessionId } = useParams();
    const [nickname, setNickname] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [stream, setStream] = useState(null);
    const [isCreator, setIsCreator] = useState(false);
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
    const [localStream, setLocalStream] = useState(null);
    const videoRefs = useRef({});

    useEffect(() => {
        const initSocket = () => {
            socketRef.current = io('https://m4otjg3lds.loclx.io/');
            
            socketRef.current.on('offer', handleReceiveOffer);
            socketRef.current.on('answer', handleReceiveAnswer);
            socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
            socketRef.current.on('end-call', handleEndCall);
            socketRef.current.on('chat-message', handleReceiveMessage);
            socketRef.current.on('client-update', handleClientUpdate);

            const id = uuidv4();
            setClientId(id);
        };

        const startStream = async () => {
            try {
                const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(localStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStream;
                }
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
        clients.forEach(client => {
            if (videoRefs.current[client.id] && client.stream) {
                videoRefs.current[client.id].srcObject = client.stream;
            }
        });
    }, [clients]);

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
            const [remoteStream] = event.streams;
            setClients(prevClients => {
                // Check if this remote stream already exists
                const existingClient = prevClients.find(client => client.id !== clientId && client.stream === remoteStream);
                if (existingClient) return prevClients; // If it exists, don't add it again
    
                // If it doesn't exist, add it to the first client without a stream
                const updatedClients = prevClients.map(client => {
                    if (client.id !== clientId && !client.stream) {
                        return { ...client, stream: remoteStream };
                    }
                    return client;
                });
                return updatedClients;
            });
        };
    
        localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    
        peerRef.current = peer;
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
        socketRef.current.emit('end-call', { sessionId, userId: clientId });
        setIsCreator(false); // Reset creator state after ending call
    };

    const handleLeaveCall = () => {
        if (peerRef.current) {
            peerRef.current.close();
        }
        socketRef.current.emit('leave-call', { sessionId });
        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;
        setStream(null);
        setIsCreator(false);
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

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    const joinSession = async () => {
        const id = uuidv4();
        setClientId(id);

        socketRef.current.emit('join-session', { sessionId, clientId: id, nickname });

        // Fetch session data to determine if the current user is the creator
        fetch(`/api/sessions/${sessionId}`)
            .then(response => response.json())
            .then(data => {
                setCreatorNickname(data.creatorNickname); // Assuming creatorNickname is stored in the session data
                if (data.creatorId === id) {
                    setIsCreator(true);
                }
            })
            .catch(error => console.error('Error fetching session data:', error));

        setIsModalOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-gray-100">
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg">
                        <Dialog.Title className="text-2xl mb-4">Enter your nickname</Dialog.Title>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Nickname"
                            className="p-2 border border-gray-300 rounded mb-4 w-full"
                        />
                        <button onClick={joinSession} 
                        className="bg-blue-500 text-white py-2 px-4 rounded w-full mb-4 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            Join Session
                        </button>
                        <Dialog.Close asChild>
                            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                                <Cross2Icon />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

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
        
        {/* Remote Videos */}
        {clients.filter(client => client.id !== clientId && client.stream).map(client => (
            <div key={client.id} className="w-full">
                <div className="text-lg font-semibold mb-2">
                    {client.nickname}
                </div>
                <video 
                    ref={el => {
                        if (el) el.srcObject = client.stream;
                    }}
                    autoPlay 
                    playsInline 
                    className="w-full aspect-video object-cover border rounded"
                ></video>
            </div>
        ))}
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
            <div className="bg-gray-100 p-4 rounded shadow-md w-full md:w-1/4 max-w-md">
                <h2 className="text-xl font-bold mb-4">Chat</h2>
                <ScrollArea.Root className="h-[400px] overflow-hidden">
                    <ScrollArea.Viewport className="h-full w-full">
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
                        </div>
                    </ScrollArea.Viewport>
                    <ScrollArea.Scrollbar orientation="vertical">
                        <ScrollArea.Thumb />
                    </ScrollArea.Scrollbar>
                </ScrollArea.Root>
                <div className="mt-4 flex items-center space-x-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="p-2 border border-gray-300 rounded w-full"
                    />
                    <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Session;