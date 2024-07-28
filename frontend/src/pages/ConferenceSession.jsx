// import { useEffect, useRef, useState } from 'react';
// import { useParams, useLocation } from 'react-router-dom';
// import { v4 as uuidv4 } from 'uuid';
// import useSocketSetup from '../components/useSocketSetup';
// import useWebRTC from '../components/useWebRTC';
// import ChatComponent from '../components/ChatComponent';
// import NicknameModal from '../components/NicknameModal';

// const ConferenceSession = () => {
//     const { sessionId } = useParams();
//     const location = useLocation();
//     const [nickname, setNickname] = useState(location.state?.nickname || '');
//     const [isModalOpen, setIsModalOpen] = useState(!location.state?.nickname);
//     const [isCreator, setIsCreator] = useState(false);
//     const [clientId, setClientId] = useState('');
//     const [clients, setClients] = useState([]);
//     const [sessionStatus, setSessionStatus] = useState('active');
//     const [localStream, setLocalStream] = useState(null);
//     const videoRef = useRef(null);
//     const sessionUrl = `${window.location.origin}/conference/${sessionId}`;

//     const { socketRef, messages, setMessages, newMessage, setNewMessage, handleSendMessage } = useSocketSetup(sessionId, nickname, clientId);
//     const { peerConnections, remoteStreams, handleStartCall, handleEndCall } = useWebRTC(socketRef, sessionId, clientId, localStream, isCreator);

//     useEffect(() => {
//         const initSession = async () => {
//             const id = location.state?.userId || uuidv4();
//             setClientId(id);
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//                 setLocalStream(stream);
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = stream;
//                 }
//             } catch (error) {
//                 console.error('Error accessing media devices.', error);
//             }
//         };
    
//         initSession();
    
//         return () => {
//             if (localStream) {
//                 localStream.getTracks().forEach(track => track.stop());
//             }
//         };
//     }, [location.state]);

//     useEffect(() => {
//         if (nickname && clientId) {
//             joinSession();
//         }
//     }, [nickname, clientId]);

//     useEffect(() => {
//         if (videoRef.current) {
//             if (isCreator) {
//                 videoRef.current.srcObject = localStream;
//             } else {
//                 // Get the first remote stream (should be the creator's stream)
//                 const creatorStream = Object.values(remoteStreams)[0];
//                 if (creatorStream) {
//                     videoRef.current.srcObject = creatorStream;
//                 }
//             }
//         }
//     }, [isCreator, localStream, remoteStreams]);

//     useEffect(() => {
//         if (socketRef.current) {
//             socketRef.current.on('client-update', (updatedClients) => {
//                 setClients(updatedClients);
//             });
//             socketRef.current.on('conference-started', () => {
//                 if (!isCreator) {
//                     handleStartCall();
//                 }
//             });
//         }
//         return () => {
//             if (socketRef.current) {
//                 socketRef.current.off('client-update');
//                 socketRef.current.off('conference-started');
//             }
//         };
//     }, [socketRef, isCreator, handleStartCall]);

//     const joinSession = async () => {
//         try {
//             socketRef.current.emit('join-session', { sessionId, clientId, nickname }, (response) => {
//                 if (response.success) {
//                     setIsModalOpen(false);
//                     setIsCreator(response.isCreator);
//                 } else {
//                     alert(response.message);
//                     window.location.href = '/';
//                 }
//             });
//         } catch (error) {
//             console.error('Error joining session:', error);
//             alert('Error joining session. Please try again.');
//         }
//     };

//     const handleLeaveCall = () => {
//         if (isCreator) {
//             handleEndCall();
//         } else {
//             socketRef.current.emit('leave-call', { sessionId, clientId });
//         }
//     };
    

//     const handleStartConference = () => {
//         if (isCreator) {
//             handleStartCall();
//             socketRef.current.emit('start-conference', { sessionId });
//         }
//     };

//     const handleCopyUrl = () => {
//         const joinUrl = `${sessionUrl}`;
//         const message = `Join this conference session: ${joinUrl}`;
//         const data = `${nickname} has invited you to join the conference session.\n\n Session ID is : ${sessionId}\n\n${message}`;
//         navigator.clipboard.writeText(data);
//         alert('Session URL copied to clipboard');
//     };

//     return (
//         <div className="flex flex-col md:flex-row items-center justify-center h-screen bg-gray-100">
//             <NicknameModal 
//                 isOpen={isModalOpen} 
//                 setIsOpen={setIsModalOpen}
//                 nickname={nickname}
//                 setNickname={setNickname}
//                 joinSession={joinSession}
//             />

//             {/* Video Section */}
//             <div className="bg-white p-6 rounded shadow-md w-full md:w-3/4 max-w-md">
//                 <h1 className="text-2xl font-bold mb-4">Conference Session: {sessionId}</h1>
//                 <p className="text-lg mb-4">Participants: {clients.length}</p>
//                 <div className="w-full">
//                     <video 
//                         ref={videoRef}
//                         autoPlay 
//                         playsInline 
//                         className="w-full aspect-video object-cover border rounded"
//                     ></video>
//                 </div>
                
//                 <div className="mt-6 space-y-4">
//                     {isCreator && (
//                         <button 
//                             onClick={handleStartConference} 
//                             className="bg-blue-500 text-white py-2 px-4 rounded w-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
//                         >
//                             Start Conference
//                         </button>
//                     )}
//                     <button 
//                         onClick={handleCopyUrl} 
//                         className="bg-green-500 text-white py-2 px-4 rounded w-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
//                     >
//                         Copy Session URL
//                     </button>
//                     {!isCreator && (
//                         <button 
//                             onClick={handleLeaveCall} 
//                             className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
//                         >
//                             Leave Call
//                         </button>
//                     )}
//                     {isCreator && (
//                         <button 
//                             onClick={handleEndCall} 
//                             className="bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
//                         >
//                             End Conference
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* Chat Section */}
//             <ChatComponent 
//                 messages={messages}
//                 newMessage={newMessage}
//                 setNewMessage={setNewMessage}
//                 handleSendMessage={handleSendMessage}
//                 nickname={nickname}
//             />
//         </div>
//     );
// };

// export default ConferenceSession;