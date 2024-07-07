// frontend/src/pages/CreateSession.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import { Button } from '@radix-ui/themes';
import { FiCopy, FiPlus, FiLogIn } from 'react-icons/fi';

const CreateSession = () => {
    const [nickname, setNickname] = useState('');
    const [sessionUrl, setSessionUrl] = useState('');
    const [joinSessionId, setJoinSessionId] = useState('');
    const navigate = useNavigate();
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
    }, []);

    const handleCreateSession = async (event) => {
        event.preventDefault();
        try {
            const userId = uuidv4();
            const response = await axios.post('http://localhost:5000/api/sessions/create-session', { nickname, userId });
            const sessionId = response.data.sessionId;
            const url = `${window.location.origin}/session/${sessionId}`;
            setSessionUrl(url);
            navigate(`/session/${sessionId}`, { state: { userId, nickname } });
        } catch (error) {
            console.error('Error creating session', error);
        }
    };

    const handleJoinSession = (event) => {
        event.preventDefault();
        if (joinSessionId) {
            navigate(`/session/${joinSessionId}`, { state: { nickname } });
        }
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(sessionUrl);
        alert('Session URL copied to clipboard');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
            <div style={{ flex: 1, marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Create a Session</h1>
                <Form.Root onSubmit={handleCreateSession}>
                    <Form.Field name="nickname">
                        <Form.Label>Nickname</Form.Label>
                        <Form.Control asChild>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Enter your nickname"
                                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                            />
                        </Form.Control>
                    </Form.Field>
                    <Form.Submit asChild>
                        <Button style={{ display: 'flex', alignItems: 'center' }}>
                            <FiPlus style={{ marginRight: '5px' }} /> Create Session
                        </Button>
                    </Form.Submit>
                </Form.Root>
                
                {sessionUrl && (
                    <div style={{ marginTop: '20px' }}>
                        <p>Share this URL to join the session:</p>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                            <input
                                type="text"
                                value={sessionUrl}
                                readOnly
                                style={{ flex: 1, padding: '8px', marginRight: '10px' }}
                            />
                            <Button onClick={handleCopyUrl} style={{ display: 'flex', alignItems: 'center' }}>
                                <FiCopy style={{ marginRight: '5px' }} /> Copy URL
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Separator.Root style={{ height: '1px', backgroundColor: 'gray', margin: '20px 0' }} />

            <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Join a Session</h1>
                <Form.Root onSubmit={handleJoinSession}>
                    <Form.Field name="sessionId">
                        <Form.Label>Session ID</Form.Label>
                        <Form.Control asChild>
                            <input
                                type="text"
                                value={joinSessionId}
                                onChange={(e) => setJoinSessionId(e.target.value)}
                                placeholder="Enter session ID"
                                style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                            />
                        </Form.Control>
                    </Form.Field>
                    <Form.Submit asChild>
                        <Button style={{ display: 'flex', alignItems: 'center' }}>
                            <FiLogIn style={{ marginRight: '5px' }} /> Join Session
                        </Button>
                    </Form.Submit>
                </Form.Root>
            </div>
        </div>
    );
};

export default CreateSession;