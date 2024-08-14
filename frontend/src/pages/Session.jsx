// frontend\src\pages\Session.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import useSocketSetup from '../components/useSocketSetup';
import useWebRTC from '../components/useWebRTC';
import ChatComponent from '../components/ChatComponent';
import NicknameModal from '../components/NicknameModal';
import { CiMicrophoneOn, CiMicrophoneOff  } from "react-icons/ci";
import { TbCamera, TbCameraOff  } from "react-icons/tb";
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { PiClipboardText } from "react-icons/pi";

const Session = () => {
    const { sessionId } = useParams();
    const location = useLocation();
    const [nickname, setNickname] = useState(location.state?.nickname || '');
    const [isModalOpen, setIsModalOpen] = useState(!location.state?.nickname);
    const [isCreator, setIsCreator] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clients, setClients] = useState([]);
    const [alertMessage, setAlertMessage] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [localStream, setLocalStream] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [clientCount, setClientCount] = useState(0);
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;


    const { socketRef, messages, newMessage, setNewMessage, handleSendMessage } = useSocketSetup(sessionId, nickname, clientId);
    const { remoteStream, handleStartCall, handleEndCall, handleLeaveCall } = useWebRTC(socketRef, sessionId, clientId, localStream);

    useEffect(() => {
        const initSession = async () => {
            const id = location.state?.userId || uuidv4();
            setClientId(id);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing media devices.', error);
            }
        };
    
        initSession();
    
        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [location.state]);
    

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    useEffect(() => {
        if (nickname && clientId) {
            joinSession();
        }
    }, [nickname, clientId]);

    useEffect(() => {
        const checkSessionStatus = async () => {
            try {
              const serverUrl = import.meta.env.VITE_SERVER_URL;
              const response = await axios.get(`${serverUrl}/api/sessions/${sessionId}/status`);
                if (response.data.status === 'expired') {
                    setAlertMessage('This session has expired.');
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('Error checking session status:', error);
                setAlertMessage('Error checking session status. Please try again.');
            }
        };
    
        checkSessionStatus();
    
        if (socketRef.current) {
            socketRef.current.on('session-status', (status) => {
                if (status === 'expired') {
                    setAlertMessage('This session has expired.');
                }
            });
        }
    }, [sessionId, socketRef]);
    
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on('client-update', (clients) => {
                setClients(clients);
                setClientCount(clients.length);
            });
    
            socketRef.current.on('session-full', () => {
                setAlertMessage('This session is full. You will be redirected to the home page.');
                setTimeout(() => window.location.href = '/', 3000);
            });
        }
    
        return () => {
            const currentSocketRef = socketRef.current;
            if (currentSocketRef) {
                currentSocketRef.off('session-full');
                currentSocketRef.off('client-update');
            }
        };
    }, [socketRef]);
    

    const joinSession = async () => {
        try {
            socketRef.current.emit('join-session', { sessionId, clientId, nickname }, (response) => {
                if (response.success) {
                    setIsModalOpen(false);
                    setIsCreator(response.isCreator);
                } else {
                    setAlertMessage(response.message);
                    if (response.message === 'This session is full') {
                      setAlertMessage('This session is full. You will be redirected to the home page.');
                        window.location.href = '/';
                    }
                }
            });
        } catch (error) {
            console.error('Error joining session:', error);
            setAlertMessage('Error joining session. Please try again.');
        }
    };
    

    const handleCopyUrl = () => {
        const joinUrl = `${sessionUrl}`;
        const message = `Join this session: ${joinUrl}`;
        const data = `${nickname} has invited you to join the session.\n\n Session ID is : ${sessionId}\n\n${message}`;
        navigator.clipboard.writeText(data);
        setAlertMessage('Session URL copied to clipboard');
    };   
    const handleCopyId = () => {
        const data = `${sessionId}`;
        navigator.clipboard.writeText(data);
        setAlertMessage('Session ID copied to clipboard');
    };   

    const toggleCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
                setCameraEnabled(track.enabled);
            });
        }
    };

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
                setMicEnabled(track.enabled);
            });
        }
    };

    return (
        <section className="h-screen w-screen overflow-hidden">
          <div className="h-full w-full p-2 sm:p-4">
            <ul className="h-full grid grid-cols-1 gap-2 lg:grid-cols-3 lg:grid-rows-2">
              {/* Video Call Section */}
              <li className="lg:col-span-2 lg:row-span-2">
                <div className="group relative bg-white p-2 rounded shadow-md w-full h-full overflow-auto">
                  <h1 className="text-xl font-bold mb-2">Session: {sessionId}  &nbsp;
                    <button onClick={handleCopyId} className="inline-block rounded bg-gray-800 px-2 py-2 text-base font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring active:bg-green-500"
                    ><PiClipboardText />
                    </button></h1>
                  <p className="text-sm mb-2">Participants: {clientCount}</p>
                  <div className="flex flex-col items-center space-y-2">
                    {/* Local Video */}
                    <div className="relative w-3/5 group">
                      <div className="text-sm font-semibold mb-1">
                        {nickname} (You)
                      </div>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-video object-cover border rounded"
                      ></video>
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                          <button
                            onClick={toggleCamera}
                            className="p-1 rounded-full bg-white text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {cameraEnabled ? <TbCamera /> : <TbCameraOff />}
                          </button>
                          <button
                            onClick={toggleMic}
                            className="p-1 rounded-full bg-white text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {micEnabled ? <CiMicrophoneOn /> : <CiMicrophoneOff />}
                          </button>
                        </div>
                      </div>
                    </div>
      
                    {/* Remote Video */}
                    <div className="w-3/5">
                      <div className="text-sm font-semibold mb-1">
                        {isCreator ? clients[1]?.nickname : (clients.length > 0 && clients[0]?.nickname)}
                      </div>
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full aspect-video object-cover border rounded"
                      ></video>
                    </div>
                  </div>
      
                  <div className="mt-2 mx-72 space-x-12">
                    <button
                      onClick={handleStartCall}
                      className="inline-block rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring active:bg-indigo-500"
                    >
                      Start Call
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="inline-block rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-green-700 focus:outline-none focus:ring active:bg-green-500"
                    >
                      Copy URL
                    </button>
                    {isCreator ? (
                      <button
                        onClick={handleEndCall}
                        className="inline-block rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring active:bg-red-500"
                      >
                        End Call
                      </button>
                    ) : (
                      <button
                        onClick={handleLeaveCall}
                        className="inline-block rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring active:bg-red-500"
                      >
                        Leave Call
                      </button>
                    )}
                  </div>
                </div>
              </li>
      
              {/* Chat Section */}
              <li className="overflow-hidden rounded-lg border border-gray-200">
                <ChatComponent
                  messages={messages}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  handleSendMessage={handleSendMessage}
                  nickname={nickname}
                />
              </li>
      
              {/* Clients List Section */}
              <li className="overflow-hidden rounded-lg border border-gray-200">
                <h2 className="text-lg font-bold p-2">Participants</h2>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full divide-y divide-gray-200 bg-white text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-2 py-1 font-medium text-gray-900 text-left">No.</th>
                        <th className="px-2 py-1 font-medium text-gray-900 text-left">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clients.map((client, index) => (
                        <tr key={client.clientId}>
                          <td className="px-2 py-1 font-medium text-gray-900">{index + 1}</td>
                          <td className="px-2 py-1 text-gray-700">{client.nickname}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
            </ul>
          </div>
      
          {/* Nickname Modal and Alert */}
          <NicknameModal
            isOpen={isModalOpen}
            setIsOpen={setIsModalOpen}
            nickname={nickname}
            setNickname={setNickname}
            joinSession={joinSession}
          />
          {alertMessage && (
            <div role="alert" className="fixed top-4 right-4 z-50 rounded-xl border border-gray-100 bg-white p-2 shadow-lg max-w-xs">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <strong className="block font-medium text-gray-900 text-sm">Alert</strong>
                  <p className="mt-1 text-xs text-gray-700">{alertMessage}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
                      onClick={() => setAlertMessage(null)}
                    >
                      Ok
                    </button>
                  </div>
                </div>
                <button
                  className="text-gray-500 transition hover:text-gray-600"
                  onClick={() => setAlertMessage(null)}
                >
                  <span className="sr-only">Dismiss popup</span>
                  <IoIosCloseCircleOutline />
                </button>
              </div>
            </div>
          )}
        </section>
      );
      
};

export default Session;