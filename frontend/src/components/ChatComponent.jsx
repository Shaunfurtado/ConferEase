import { useEffect, useRef } from 'react';

const ChatComponent = ({ messages, newMessage, setNewMessage, handleSendMessage, nickname }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex flex-col h-full w-full p-4 rounded shadow-md bg-gray-100">
            <h2 className="text-xl font-bold mb-4">Chat</h2>
            <div className="flex-grow overflow-y-auto h-32">
                <div className="flex w-full flex-col gap-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex max-w-[80%] ${
                                msg.sender === nickname ? 'ml-auto' : 'mr-auto'
                            } flex-col gap-2 rounded-xl p-4 ${
                                msg.sender === nickname
                                    ? 'bg-blue-700 text-slate-100 dark:bg-blue-600 dark:text-slate-100'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            <span className="font-semibold text-black dark:text-white">
                                {msg.sender}
                            </span>
                            <div className="text-sm">
                                {msg.message}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="p-2 border border-gray-300 rounded w-full"
                />
                <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded">
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatComponent;
