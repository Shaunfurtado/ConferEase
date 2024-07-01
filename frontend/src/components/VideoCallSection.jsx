import React, { useEffect } from 'react';

const VideoCallSection = ({
    localVideoRef,
    remoteVideoRefs,
    clients,
    clientId,
    handleStartCall,
    handleEndCall,
    handleLeaveCall,
    handleCopyUrl,
    isCreator,
    creatorNickname,
    sessionId,
    stream
}) => {
    useEffect(() => {
        if (!stream || !remoteVideoRefs) return;

        const peerConnections = {};

        const createPeer = (clientId) => {
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
                remoteVideoRefs[clientId].current.srcObject = event.streams[0];
            };

            stream.getTracks().forEach(track => peer.addTrack(track, stream));

            peerConnections[clientId] = peer;
        };

        clients.forEach(client => {
            if (client.id !== clientId && !peerConnections[client.id]) {
                createPeer(client.id);
            }
        });

        return () => {
            Object.values(peerConnections).forEach(peer => {
                peer.close();
            });
        };
    }, [clients, clientId, remoteVideoRefs, sessionId, stream]);

    return (
        <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
            <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
            <div className="flex flex-col items-center">
                <div>
                    <strong>Admin:</strong> {clients.find(client => client.isCreator)?.nickname}
                </div>
                <video ref={localVideoRef} autoPlay playsInline className="w-full mb-4 border rounded"></video>
                <div className="flex flex-col items-center">
                    {clients.filter(client => client.id !== clientId).map(client => (
                        <div key={client.id}>
                            <strong>Client:</strong> {client.nickname}
                            <video ref={remoteVideoRefs[client.id]} autoPlay playsInline className="w-full mb-4 border rounded"></video>
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
            {isCreator && creatorNickname && (
                <button
                    onClick={handleEndCall}
                    className="bg-red-500 text-white py-2 px-4 rounded w-full"
                >
                    End Call
                </button>
            )}
            {!isCreator && (
                <button
                    onClick={handleLeaveCall}
                    className="bg-red-500 text-white py-2 px-4 rounded w-full"
                >
                    Leave Call
                </button>
            )}
        </div>
    );
};

export default VideoCallSection;
