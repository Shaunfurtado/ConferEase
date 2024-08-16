import React, { useEffect, useRef } from 'react';

const ConferenceSession = ({ roomName, socket, mediasoupClient }) => {
  const videoRefs = useRef({}); // Holds refs for video elements per user

  useEffect(() => {
    const joinConference = async () => {
      const { device, recvTransport } = await mediasoupClient.init(); // Assuming you have a `mediasoupClient` setup function

      // Join the room
      socket.emit('join-conference', roomName);

      socket.on('new-producer', async ({ producerId, userId }) => {
        const stream = await mediasoupClient.consume(recvTransport, producerId);

        if (!videoRefs.current[userId]) {
          videoRefs.current[userId] = React.createRef();
        }
        videoRefs.current[userId].current.srcObject = stream;
      });
    };

    joinConference();

    return () => {
      socket.emit('leave-conference', roomName);
    };
  }, [roomName, socket, mediasoupClient]);

  return (
    <div className="conference-grid">
      {Object.keys(videoRefs.current).map((userId) => (
        <video key={userId} ref={videoRefs.current[userId]} autoPlay />
      ))}
    </div>
  );
};

// Export the component as the default export
export default ConferenceSession;
