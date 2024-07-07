import React, { useRef, useEffect } from 'react';

const VideoSection = ({ 
    sessionId, 
    nickname, 
    clients, 
    clientId, 
    localStream, 
    localVideoRef, 
    handleStartCall, 
    handleEndCall, 
    handleLeaveCall, 
    handleCopyUrl, 
    isCreator 
}) => {

    useEffect(() => {
        clients.forEach(client => {
            if (client.stream && client.id !== clientId) {
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = client.stream;
                }
            }
        });
    }, [clients, clientId]);

    return (
        <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
            <h1 className="text-2xl font-bold mb-4">Session: {sessionId}</h1>
            <div className="flex flex-col items-center space-y-4">
                {/* Local Video */}
                <div className="w-full">
                    <div className="text-lg font-semibold mb-2">{nickname} (You)</div>
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full aspect-video object-cover border rounded"></video>
                </div>

                {/* Remote Videos */}
                {clients.filter(client => client.id !== clientId && client.stream).map(client => (
                    <div key={client.id} className="w-full">
                        <div className="text-lg font-semibold mb-2">{client.nickname}</div>
                        <video ref={el => el && (el.srcObject = client.stream)} autoPlay playsInline className="w-full aspect-video object-cover border rounded"></video>
                    </div>
                ))}
            </div>

            <div className="mt-6 space-y-4">
                <button onClick={handleStartCall} className="bg-blue-500 text-white py-2 px-4 rounded w-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Start Call</button>
                <button onClick={handleCopyUrl} className="bg-green-500 text-white py-2 px-4 rounded w-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">Copy Session URL</button>
                {isCreator ? (
                    <button onClick={handleEndCall} className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">End Call</button>
                ) : (
                    <button onClick={handleLeaveCall} className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Leave Call</button>
                )}
            </div>
        </div>
    );
};

export default VideoSection;
