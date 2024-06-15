// frontend\src\pages\Session.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const Session = () => {
    const { sessionId } = useParams();
    const [stream, setStream] = useState(null);
    const [isCreator, setIsCreator] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef();
    const peerRef = useRef();
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;

    useEffect(() => {
        const initSocket = () => {
            socketRef.current = io('http://localhost:5000');
            
            socketRef.current.on('offer', handleReceiveOffer);
            socketRef.current.on('answer', handleReceiveAnswer);
            socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
            socketRef.current.on('end-call', handleEndCall);

            // Join session
            socketRef.current.emit('join-session', { sessionId });

            // Assuming the first participant is the creator
            setIsCreator(true);
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
        alert('Call ended by the host');
    };

    const endCall = () => {
        socketRef.current.emit('end-call', { sessionId });
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
                <video ref={localVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
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
                {isCreator && (
                    <button
                        onClick={endCall}
                        className="bg-red-500 text-white py-2 px-4 rounded w-full"
                    >
                        End Call
                    </button>
                )}
            </div>
        </div>
    );
};

export default Session;

