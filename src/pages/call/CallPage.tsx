import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface Peer {
  socketId: string;
  userId: string;
  userName: string;
}

export const CallPage: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [peers, setPeers] = useState<Peer[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const createPeerConnection = (socketId: string) => {
    const pc = new RTCPeerConnection(iceServers);

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', { to: socketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const videoEl = remoteVideoRefs.current[socketId];
      if (videoEl) videoEl.srcObject = event.streams[0];
    };

    peerConnections.current[socketId] = pc;
    return pc;
  };

  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      socket.emit('join-room', { roomId, userId: user?.id, userName: user?.name });

      socket.on('existing-participants', async (existing: Peer[]) => {
        setPeers(existing);
        for (const peer of existing) {
          const pc = createPeerConnection(peer.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { to: peer.socketId, offer });
        }
      });

      socket.on('user-joined', (peer: Peer) => {
        setPeers(prev => [...prev, peer]);
      });

      socket.on('offer', async ({ from, offer }) => {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', async ({ from, answer }) => {
        await peerConnections.current[from]?.setRemoteDescription(answer);
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        try {
          await peerConnections.current[from]?.addIceCandidate(candidate);
        } catch (e) { console.error(e); }
      });

      socket.on('user-left', ({ socketId }) => {
        peerConnections.current[socketId]?.close();
        delete peerConnections.current[socketId];
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
      });
    };

    init();

    return () => {
      socketRef.current?.emit('leave-room', { roomId });
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [roomId]);

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioOn(track.enabled);
      socketRef.current?.emit('toggle-media', { roomId, audio: track.enabled, video: videoOn });
    }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoOn(track.enabled);
      socketRef.current?.emit('toggle-media', { roomId, audio: audioOn, video: track.enabled });
    }
  };

  const endCall = () => {
    socketRef.current?.emit('leave-room', { roomId });
    socketRef.current?.disconnect();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">You</span>
        </div>
        {peers.map(peer => (
          <div key={peer.socketId} className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={el => { remoteVideoRefs.current[peer.socketId] = el; }}
              autoPlay playsInline className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">{peer.userName}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 p-6 bg-gray-800">
        <button onClick={toggleAudio} className={`p-3 rounded-full ${audioOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}>
          {audioOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button onClick={toggleVideo} className={`p-3 rounded-full ${videoOn ? 'bg-gray-700' : 'bg-red-600'} text-white`}>
          {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button onClick={endCall} className="p-3 rounded-full bg-red-600 text-white">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};
