import * as mediasoupClient from 'mediasoup-client';

export const init = async () => {
  const device = new mediasoupClient.Device();

  const response = await fetch('/mediasoup-router-capabilities');
  const routerRtpCapabilities = await response.json();

  await device.load({ routerRtpCapabilities });

  const recvTransport = device.createRecvTransport({
    id: 'recv-transport-id',
    iceParameters: /* Retrieved from the server */,
    iceCandidates: /* Retrieved from the server */,
    dtlsParameters: /* Retrieved from the server */,
  });

  return { device, recvTransport };
};

export const consume = async (recvTransport, producerId) => {
  const consumer = await recvTransport.consume({
    producerId,
    rtpCapabilities: device.rtpCapabilities,
  });

  const stream = new MediaStream();
  stream.addTrack(consumer.track);

  return stream;
};
