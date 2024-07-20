import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import { FiPlus, FiLogIn } from 'react-icons/fi';
import { IoIosCloseCircleOutline } from 'react-icons/io';

const CreateSession = () => {
    const [nickname, setNickname] = useState('');
    const [joinSessionId, setJoinSessionId] = useState('');
    const [sessionType, setSessionType] = useState('1to1'); 
    const [alertMessage, setAlertMessage] = useState(null);
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
                status: 'active'
            });
            const sessionId = response.data.sessionId;
            navigate(`/session/${sessionId}`, { state: { userId, nickname } });
        } catch (error) {
            setAlertMessage('Error creating session. Please try again.');
            console.error('Error creating session', error);
        }
    };

    const handleJoinSession = async (event) => {
        event.preventDefault();
        if (joinSessionId) {
            try {
                const userId = uuidv4();
                console.log('Joining session with userId:', userId, 'and nickname:', nickname);
    
                socketRef.current.emit('join-session', { sessionId: joinSessionId, clientId: userId, nickname }, (response) => {
                    console.log('Socket join-session response:', response);
                    if (response.success) {
                        navigate(`/session/${joinSessionId}`, { 
                            state: { 
                                userId, 
                                nickname, 
                                isCreator: response.isCreator 
                            } 
                        });
                    } else {
                        setAlertMessage(response.message);
                        if (response.message === 'This session is full') {
                            window.location.href = '/';
                        }
                    }
                });
            } catch (error) {
                setAlertMessage('Error joining session. Please try again.');
                console.error('Error joining session:', error);
            }
        } else {
            setAlertMessage('Please provide a session ID.');
        }
    };

    return (
        <section className="bg-white min-h-screen flex flex-col">
            <div className="flex flex-col lg:flex-row lg:min-h-screen">
                <div className="relative flex items-end bg-gray-900 lg:w-5/12 xl:w-6/12">
                    <img
                        alt="Background&apos;s"
                        src="https://images.unsplash.com/photo-1617195737496-bc30194e3a19?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80"
                        className="absolute inset-0 h-full w-full object-cover opacity-80"
                    />
                    <div className="relative p-12 text-white">
                        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">Anonymous Conference Platform</h2>
                        <p className="mt-4 text-white/90">
                        Experience secure and private video conferencing like never before. Our platform allows you to host and join meetings without revealing your identity. Whether you&apos;re discussing sensitive topics or just prefer to stay anonymous, we&apos;ve got you covered. Enjoy seamless communication with features like one-to-one sessions, secure chat, and easy session management. Your privacy is our priority.
                        </p>
                    </div>
                </div>
                <main className="flex-1 flex items-center justify-center p-8 sm:px-12 lg:w-7/12 xl:w-6/12">
                    <div className="w-full max-w-xl lg:max-w-3xl">
                        {alertMessage && (
                            <div role="alert" className="rounded-xl border border-gray-100 bg-white p-4 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <strong className="block font-medium text-gray-900">Alert</strong>
                                        <p className="mt-1 text-sm text-gray-700">{alertMessage}</p>
                                        <div className="mt-4 flex gap-2">
                                            <a
                                                href="#"
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                                                onClick={() => setAlertMessage(null)}
                                            >
                                                <span className="text-sm">Ok</span>
                                            </a>
                                        </div>
                                    </div>
                                    <button 
                                        className="text-gray-500 transition hover:text-gray-600" 
                                        onClick={() => setAlertMessage(null)}
                                    >
                                        <span className="sr-only">Dismiss popup <IoIosCloseCircleOutline /></span>
                                        <IoIosCloseCircleOutline />
                                    </button>
                                </div>
                            </div>
                        )}
                        <form className="space-y-8">
                            {/* Create a Session */}
                            <div>
                                <h1 className="text-2xl font-bold mb-6">Create a Session</h1>
                                <div className="space-y-6">
                                    <div>
                                        <label
                                            htmlFor="nickname"
                                            className="relative block overflow-hidden rounded-md border border-gray-200 px-3 pt-3 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600"
                                        >
                                            <input
                                                type="text"
                                                id="nickname"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                placeholder="Enter the Session Name"
                                                className="peer h-8 w-full border-none bg-transparent p-0 placeholder-transparent focus:border-transparent focus:outline-none focus:ring-0 sm:text-sm"
                                            />
                                            <span
                                                className="absolute start-3 top-3 -translate-y-1/2 text-xs text-gray-700 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs"
                                            >
                                                Session Name
                                            </span>
                                        </label>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-700">Session Type:</span>
                                        <div className="mt-2 flex space-x-4">
                                            <label className="flex cursor-pointer justify-between gap-4 rounded-lg border border-gray-100 bg-white p-4 text-sm font-medium shadow-sm hover:border-gray-200 has-[:checked]:border-blue-500 has-[:checked]:ring-1 has-[:checked]:ring-blue-500">
                                                <input
                                                    type="radio"
                                                    value="1to1"
                                                    checked={sessionType === '1to1'}
                                                    onChange={() => setSessionType('1to1')}
                                                    className="size-5 border-gray-300 text-blue-500"
                                                />
                                                <span className="ml-2">1 to 1 Session</span>
                                            </label>
                                            <label className="flex cursor-pointer justify-between gap-4 rounded-lg border border-gray-100 bg-white p-4 text-sm font-medium shadow-sm hover:border-gray-200 has-[:checked]:border-blue-500 has-[:checked]:ring-1 has-[:checked]:ring-blue-500">
                                                <input
                                                    type="radio"
                                                    value="conference"
                                                    checked={sessionType === 'conference'}
                                                    onChange={() => setSessionType('conference')}
                                                    className="size-5 border-gray-300 text-blue-500"
                                                />
                                                <span className="ml-2">Conference Mode</span>
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center rounded bg-indigo-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:bg-indigo-500"
                                        onClick={handleCreateSession}
                                    >
                                        <FiPlus className="mr-2" /> Create Session
                                    </button>
                                </div>
                            </div>
                            <span className="relative flex justify-center">
                                <div
                                    className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-transparent bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-75"
                                ></div>
                                <span className="relative z-10 bg-white px-6">Or</span>
                            </span>
                            <h1 className="text-2xl font-bold mb-6">Join a Session</h1>
                            <div className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="sessionId"
                                        className="relative block overflow-hidden rounded-md border border-gray-200 px-3 pt-3 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600"
                                    >
                                        <input
                                            type="text"
                                            id="sessionId"
                                            value={joinSessionId}
                                            onChange={(e) => setJoinSessionId(e.target.value)}
                                            placeholder="Enter session ID"
                                            className="peer h-8 w-full border-none bg-transparent p-0 placeholder-transparent focus:border-transparent focus:outline-none focus:ring-0 sm:text-sm"
                                        />
                                        <span
                                            className="absolute start-3 top-3 -translate-y-1/2 text-xs text-gray-700 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-3 peer-focus:text-xs"
                                        >
                                            Session ID
                                        </span>
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    className="inline-flex items-center rounded bg-green-600 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:outline-none focus:ring active:bg-green-500"
                                    onClick={handleJoinSession}
                                >
                                    <FiLogIn className="mr-2" /> Join Session
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </section>
    );
};

export default CreateSession;
