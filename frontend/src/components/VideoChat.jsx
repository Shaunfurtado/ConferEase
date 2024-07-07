// frontend/src/components/VideoChat.jsx
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { RxHamburgerMenu, RxCross2, RxChevronUp, RxChevronDown, RxActivity, RxCamera } from 'react-icons/rx';
import * as Button from '@radix-ui/react-button';
import { styled } from '@stitches/react';

const StyledButton = styled(Button.Root, {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  padding: '0 15px',
  fontSize: '15px',
  lineHeight: '1',
  fontWeight: '500',
  height: '35px',
  '&:hover': { backgroundColor: 'var(--accent-hover)' },
  '&:focus': { boxShadow: '0 0 0 2px var(--accent-focus)' },
});

const IconButton = styled(StyledButton, {
  width: '35px',
  padding: '0',
});

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '500' }}>Video Chat</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <IconButton>
                        <RxHamburgerMenu />
                    </IconButton>
                    <IconButton>
                        <RxChevronUp />
                    </IconButton>
                </div>
            </header>
            <div style={{ flex: 1, display: 'flex' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--muted)' }}>
                    <video ref={localVideoRef} autoPlay playsInline style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'cover' }}></video>
                </div>
                <div style={{ width: '288px', backgroundColor: 'var(--muted)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '14px', fontWeight: '500' }}>Participants</div>
                            <IconButton>
                                <RxCross2 />
                            </IconButton>
                        </div>
                    </div>
                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {/* Participants' cards can be dynamically rendered here */}
                        {/* Example: */}
                        <div style={{ position: 'relative', groupHover: { opacity: 1 } }}>
                            <img src="/placeholder.svg" width="64" height="64" alt="Participant" style={{ borderRadius: '4px', objectFit: 'cover', aspectRatio: '1' }} />
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '4px', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                                    <IconButton>
                                        <RxActivity />
                                    </IconButton>
                                    <IconButton>
                                        <RxCamera />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <IconButton>
                            <RxChevronDown />
                        </IconButton>
                        <IconButton>
                            <RxChevronUp />
                        </IconButton>
                    </div>
                </div>
            </div>
            <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <StyledButton onClick={createOffer} style={{ backgroundColor: 'var(--accent)', color: 'white', width: '96px' }}>
                    Start Call
                </StyledButton>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IconButton>
                        <RxChevronUp />
                    </IconButton>
                    <IconButton>
                        <RxCross2 />
                    </IconButton>
                </div>
            </footer>
        </div>
    );
};

export default VideoChat;