import { useRef, useEffect, useState } from 'react';

const useWebRTC = (socketRef, sessionId, clientId, localStream) => {
    const peerRef = useRef(null);
    const [remoteStream, setRemoteStream] = useState(null);

    useEffect(() => {
        if (socketRef.current) {
        socketRef.current.on('offer', handleReceiveOffer);
        socketRef.current.on('answer', handleReceiveAnswer);
        socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
        }
    }, [socketRef.current]);

    const createPeer = () => {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
            ],
        });
    
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', { sessionId, candidate: event.candidate });
            }
        };
    
        peer.ontrack = (event) => {
            console.log('Received remote track', event.streams[0]);
            setRemoteStream(event.streams[0]);
        };
    
        if (localStream) {
            localStream.getTracks().forEach(track => {
                console.log('Adding local track to peer', track);
                peer.addTrack(track, localStream);
            });
        } else {
            console.error('Local stream is not available');
        }
    
        peerRef.current = peer;
    };

    const handleReceiveOffer = async (offer) => {
        console.log('Received offer', offer);
        if (!peerRef.current) createPeer();
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        console.log('Sending answer', answer);
        socketRef.current.emit('answer', { sessionId, answer });
    };
    
    const handleReceiveAnswer = async (answer) => {
        console.log('Received answer', answer);
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleNewICECandidateMsg = async (msg) => {
        try {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(msg));
        } catch (error) {
            console.error('Error adding received ice candidate', error);
        }
    };

    const handleStartCall = async () => {
        console.log('Starting call');
        createPeer();
        const offer = await peerRef.current.createOffer();
        await peerRef.current.setLocalDescription(offer);
        console.log('Sending offer', offer);
        socketRef.current.emit('offer', { sessionId, offer });
    };

    const handleEndCall = () => {
        if (peerRef.current) {
            peerRef.current.close();
        }
        setRemoteStream(null);
        socketRef.current.emit('end-call', { sessionId, userId: clientId });
    };

    const handleLeaveCall = () => {
        if (peerRef.current) {
            peerRef.current.close();
        }
        setRemoteStream(null);
        socketRef.current.emit('leave-call', { sessionId });
    };

    return { peerRef, remoteStream, handleStartCall, handleEndCall, handleLeaveCall };
};

export default useWebRTC;