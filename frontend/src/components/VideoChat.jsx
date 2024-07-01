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
        <div className="flex flex-col h-screen bg-background text-foreground dark:bg-muted dark:text-muted-foreground">
            <header className="flex items-center justify-between px-4 py-3 bg-muted border-b border-muted/20 dark:bg-background/50 dark:border-muted/10">
                <div className="text-lg font-medium">Video Chat</div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                            <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                            <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                            <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
                        </svg>
                    </button>
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <polyline points="8 18 12 22 16 18"></polyline>
                            <polyline points="8 6 12 2 16 6"></polyline>
                            <line x1="12" x2="12" y1="2" y2="22"></line>
                        </svg>
                    </button>
                </div>
            </header>
            <div className="flex-1 flex">
                <div className="flex-1 flex items-center justify-center bg-muted/20 dark:bg-muted/10">
                    <video ref={localVideoRef} autoPlay playsInline className="max-w-full max-h-full rounded-lg object-cover"></video>
                </div>
                <div className="w-72 bg-muted/20 dark:bg-muted/10 border-l border-muted/20 dark:border-muted/10 overflow-y-auto">
                    <div className="p-4 border-b border-muted/20 dark:border-muted/10">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">Participants</div>
                            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                    <path d="M5 12h14"></path>
                                    <path d="M12 5v14"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3">
                        {/* Participants' cards can be dynamically rendered here */}
                        {/* Example: */}
                        <div className="relative group">
                            <img src="/placeholder.svg" width="64" height="64" alt="Participant" className="rounded-md object-cover aspect-square" />
                            <div className="absolute inset-0 bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex items-center gap-2 text-white">
                                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 hover:bg-muted/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                            <line x1="12" x2="12" y1="19" y2="22"></line>
                                        </svg>
                                    </button>
                                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 hover:bg-muted/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path>
                                            <rect x="2" y="6" width="14" height="12" rx="2"></rect>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-muted/20 dark:border-muted/10 flex items-center justify-between">
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
                            </svg>
                        </button>
                        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <polyline points="8 18 12 22 16 18"></polyline>
                                <polyline points="8 6 12 2 16 6"></polyline>
                                <line x1="12" x2="12" y1="2" y2="22"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <footer className="flex items-center justify-between px-4 py-3 bg-muted border-t border-muted/20 dark:bg-background/50 dark:border-muted/10">
                <button onClick={createOffer} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-24 bg-accent-foreground text-background hover:bg-accent-dark">
                    Start Call
                </button>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                    </button>
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-10 w-10 text-muted-foreground hover:bg-muted/50 dark:hover:bg-background/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default VideoChat;
