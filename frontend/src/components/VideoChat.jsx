// frontend\src\components\VideoChat.jsx
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const VideoChat = () => {
    const [socket, setSocket] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);

    useEffect(() => {
        const s = io('http://localhost:5000');
        setSocket(s);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideoRef.current.srcObject = stream;
                peerConnectionRef.current = new RTCPeerConnection();

                stream.getTracks().forEach(track => {
                    peerConnectionRef.current.addTrack(track, stream);
                });

                peerConnectionRef.current.ontrack = (event) => {
                    remoteVideoRef.current.srcObject = event.streams[0];
                };

                peerConnectionRef.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        s.emit('ice-candidate', event.candidate);
                    }
                };
            });

        s.on('offer', (data) => {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
            peerConnectionRef.current.createAnswer()
                .then(answer => {
                    peerConnectionRef.current.setLocalDescription(answer);
                    s.emit('answer', answer);
                });
        });

        s.on('answer', (data) => {
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data));
        });

        s.on('ice-candidate', (candidate) => {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        return () => s.disconnect();
    }, []);

    const createOffer = () => {
        peerConnectionRef.current.createOffer()
            .then(offer => {
                peerConnectionRef.current.setLocalDescription(offer);
                socket.emit('offer', offer);
            });
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex">
                <video ref={localVideoRef} autoPlay playsInline className="w-1/2"></video>
                <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2"></video>
            </div>
            <button onClick={createOffer} className="mt-4 bg-blue-500 text-white p-2 rounded">
                Start Call
            </button>
        </div>
    );
};

export default VideoChat;
