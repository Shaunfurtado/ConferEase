// frontend\src\pages\CreateSession.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import { Button } from '@radix-ui/themes';
import { FiPlus, FiLogIn } from 'react-icons/fi';

const CreateSession = () => {
    const [nickname, setNickname] = useState('');
    const [joinSessionId, setJoinSessionId] = useState('');
    const [sessionType, setSessionType] = useState('1to1'); // Default session type
    const navigate = useNavigate();
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = io('http://localhost:5000');
    }, []);

    const handleCreateSession = async (event) => {
        event.preventDefault();
        try {
            const userId = uuidv4();
            const response = await axios.post('http://localhost:5000/api/sessions/create-session', {
                nickname,
                userId,
                sessionType,
                status: 'active' // Set status as active by default
            });
            const sessionId = response.data.sessionId;
            navigate(`/session/${sessionId}`, { state: { userId, nickname } });
        } catch (error) {
            console.error('Error creating session', error);
        }
    };

    const handleJoinSession = async (event) => {
        event.preventDefault();
        if (joinSessionId) {
            try {
                const userId = uuidv4();
                const response = await axios.post(`http://localhost:5000/api/sessions/${joinSessionId}/join`, { 
                    userId, 
                    nickname 
                });
                
                if (response.status === 200) {
                    const { creatorId } = response.data;
                    const isCreator = creatorId === userId;
                    
                    socketRef.current.emit('join-session', { 
                        sessionId: joinSessionId, 
                        clientId: userId, 
                        nickname 
                    });
                    
                    navigate(`/session/${joinSessionId}`, { 
                        state: { 
                            userId, 
                            nickname, 
                            isCreator 
                        } 
                    });
                } else {
                    throw new Error('Failed to join session');
                }
            } catch (error) {
                console.error('Error joining session', error);
                alert('Error joining session. Please try again.');
            }
        }
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
                    <Form.Field name="sessionType">
                        <Form.Label>Session Type</Form.Label>
                        <Form.Control asChild>
                            <div>
                                <label>
                                    <input
                                        type="radio"
                                        value="1to1"
                                        checked={sessionType === '1to1'}
                                        onChange={() => setSessionType('1to1')}
                                    />
                                    1 to 1 Session
                                </label>
                                <label style={{ marginLeft: '10px' }}>
                                    <input
                                        type="radio"
                                        value="conference"
                                        checked={sessionType === 'conference'}
                                        onChange={() => setSessionType('conference')}
                                    />
                                    Conference Mode
                                </label>
                            </div>
                        </Form.Control>
                    </Form.Field>
                    <Form.Submit asChild>
                        <Button style={{ display: 'flex', alignItems: 'center' }}>
                            <FiPlus style={{ marginRight: '5px' }} /> Create Session
                        </Button>
                    </Form.Submit>
                </Form.Root>
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
