import React, { useState, useEffect, useRef } from 'react';
import { Mic, Users, Gift as GiftIcon, Shield, X, Crown, Star, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Room, Gift } from '../types';

interface RoomsProps {
  user: User;
  onUpdateUser: (data: Partial<User>) => void;
}

export default function Rooms({ user, onUpdateUser }: RoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');
  const [showGifts, setShowGifts] = useState<number | null>(null); // user_id to send gift to
  const [giftTab, setGiftTab] = useState<'normal' | 'luck' | 'flag'>('normal');
  const [giftQuantity, setGiftQuantity] = useState<number>(1);
  const [giftNotification, setGiftNotification] = useState<{ message: string, icon: string, quantity?: number } | null>(null);
  const [lastSentGift, setLastSentGift] = useState<{ receiver_id: number, gift_id: number, quantity: number } | null>(null);
  const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Slot Game State
  const [showSlotGame, setShowSlotGame] = useState(false);
  const [slotBet, setSlotBet] = useState(100);
  const [slotResult, setSlotResult] = useState<string[]>(['💎', '💎', '💎']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  // WebRTC State
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<number, RTCPeerConnection>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const activeRoomRef = useRef<any>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
    
    // Cleanup when leaving room
    if (!activeRoom) {
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      setRemoteStreams({});
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    }
  }, [activeRoom]);

  const fetchData = async () => {
    try {
      const [roomsRes, giftsRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/gifts')
      ]);
      setRooms(await roomsRes.json());
      setGifts(await giftsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendWebRTCSignal = (targetUserId: number, signal: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeRoomRef.current) {
      console.log(`[WebRTC] Sending ${signal.type || 'candidate'} to ${targetUserId}`);
      wsRef.current.send(JSON.stringify({
        type: 'webrtc',
        roomId: activeRoomRef.current.id,
        senderId: user.id,
        targetUserId,
        signal
      }));
    }
  };

  const createPeerConnection = (targetUserId: number) => {
    console.log(`[WebRTC] Creating PeerConnection for ${targetUserId}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebRTCSignal(targetUserId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received track from ${targetUserId}`, event.streams[0]);
      setRemoteStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        pc.close();
        delete peerConnections.current[targetUserId];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[targetUserId];
          return next;
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      console.log(`[WebRTC] Negotiation needed for ${targetUserId}`);
      if (pc.signalingState !== 'stable') {
        console.log(`[WebRTC] Skipping negotiation because state is ${pc.signalingState}`);
        return;
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWebRTCSignal(targetUserId, offer);
      } catch (err) {
        console.error("[WebRTC] Error creating offer on negotiation needed:", err);
      }
    };

    peerConnections.current[targetUserId] = pc;
    return pc;
  };

  const handleWebRTCSignal = async (data: any) => {
    const { senderId, signal } = data;
    console.log(`[WebRTC] Received ${signal.type || 'candidate'} from ${senderId}`);
    
    let pc = peerConnections.current[senderId];
    
    if (signal.type === 'offer') {
      if (!pc) pc = createPeerConnection(senderId);
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        
        if (localStreamRef.current) {
          const senders = pc.getSenders();
          localStreamRef.current.getTracks().forEach(track => {
            if (!senders.some(s => s.track === track)) {
              console.log(`[WebRTC] Adding local track to ${senderId} in response to offer`);
              pc.addTrack(track, localStreamRef.current!);
            }
          });
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[WebRTC] Sending answer to ${senderId}`);
        sendWebRTCSignal(senderId, answer);
      } catch (err) {
        console.error("[WebRTC] Error handling offer:", err);
      }
      
    } else if (signal.type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } catch (err) {
          console.error("[WebRTC] Error handling answer:", err);
        }
      }
    } else if (signal.candidate) {
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal));
        } catch (err) {
          console.error("[WebRTC] Error adding ICE candidate:", err);
        }
      }
    }
  };

  useEffect(() => {
    fetchData();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const currentRoom = activeRoomRef.current;
      
      if (data.type === 'ROOMS_UPDATED') fetchData();
      if (data.type === 'ROOM_STATE_UPDATED' && currentRoom && data.roomId == currentRoom.id) {
        joinRoom(currentRoom.id);
      }
      if (data.type === 'GIFT_SENT' && currentRoom && data.roomId == currentRoom.id) {
        setGiftNotification({ message: data.message, icon: data.giftIcon || '🎁', quantity: data.quantity || 1 });
        setTimeout(() => setGiftNotification(null), 3000);
      }
      if (data.type === 'webrtc' && currentRoom && data.roomId === currentRoom.id) {
        if (data.targetUserId === user.id) {
          await handleWebRTCSignal(data);
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [user.id]);

  useEffect(() => {
    if (!activeRoom) return;
    
    const currentSpeakers = activeRoom.mics?.map((m: any) => m.id).filter((id: number) => id !== user.id) || [];
    const amISpeaker = activeRoom.mics?.some((m: any) => m.id === user.id);
    
    // Handle being kicked
    if (!amISpeaker && localStreamRef.current) {
      stopMic();
    }
    
    // Connect to new speakers
    currentSpeakers.forEach(async (speakerId: number) => {
      if (!peerConnections.current[speakerId]) {
        // If we are both speakers, avoid glare by letting the lower ID send the offer
        if (amISpeaker && user.id > speakerId) {
          return;
        }
        
        const pc = createPeerConnection(speakerId);
        
        if (amISpeaker && localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
          });
        } else {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        }
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWebRTCSignal(speakerId, offer);
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      }
    });
    
    // Cleanup connections for speakers who left
    Object.keys(peerConnections.current).forEach((idStr) => {
      const id = parseInt(idStr);
      if (!currentSpeakers.includes(id)) {
        peerConnections.current[id].close();
        delete peerConnections.current[id];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });

  }, [activeRoom?.mics]);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      Object.entries(peerConnections.current).forEach(async ([idStr, pc]) => {
        const targetUserId = parseInt(idStr);
        stream.getTracks().forEach(track => {
          const senders = pc.getSenders();
          if (!senders.some(s => s.track?.kind === 'audio')) {
            pc.addTrack(track, stream);
          }
        });
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWebRTCSignal(targetUserId, offer);
        } catch (err) {
          console.error("Error renegotiating:", err);
        }
      });
      return true;
    } catch (e) {
      console.error('Error accessing microphone', e);
      alert('تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.');
      return false;
    }
  };

  const stopMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track === track);
          if (sender) {
            try {
              pc.removeTrack(sender);
            } catch (e) {
              console.error("Error removing track:", e);
            }
          }
        });
      });
      localStreamRef.current = null;
    }
  };

  const joinRoom = async (id: number) => {
    try {
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      setActiveRoom(data);
    } catch (e) {
      console.error(e);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, image: newRoomImage })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setShowCreate(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMic = async (mic_index: number, action: 'take' | 'leave' | 'kick') => {
    try {
      if (action === 'take') {
        const success = await startMic();
        if (!success) return; // Don't take mic on server if we can't get local audio
      } else if (action === 'leave') {
        stopMic();
      }

      await fetch(`/api/rooms/${activeRoom.id}/mic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mic_index, action })
      });
    } catch (e) {
      console.error(e);
      if (action === 'take') stopMic(); // Cleanup if server request fails
    }
  };

  const sendGift = async (receiver_id: number, gift_id: number, quantity: number = giftQuantity) => {
    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: activeRoom.id, receiver_id, gift_id, quantity })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        onUpdateUser({ points: data.newPoints });
        setShowGifts(null);
        setGiftQuantity(1); // Reset quantity after sending
        
        // Setup combo
        setLastSentGift({ receiver_id, gift_id, quantity });
        if (comboTimer) clearTimeout(comboTimer);
        const timer = setTimeout(() => setLastSentGift(null), 5000); // 5 seconds to combo
        setComboTimer(timer);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeMics = async (target_mics: number) => {
    try {
      const res = await fetch(`/api/rooms/${activeRoom.id}/mics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_mics })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
    } catch (e) {
      console.error(e);
    }
  };

  const playSlotGame = async () => {
    if (user.points < slotBet) {
      alert('نقاطك غير كافية');
      return;
    }
    
    setIsSpinning(true);
    setSlotMessage('');
    
    // Simulate spinning
    const interval = setInterval(() => {
      const symbols = ['💎', '👑', '🌟', '💰', '🍒', '🔔', '7️⃣'];
      setSlotResult([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
    }, 100);

    try {
      const res = await fetch('/api/games/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet: slotBet })
      });
      const data = await res.json();
      
      setTimeout(() => {
        clearInterval(interval);
        setIsSpinning(false);
        if (data.error) {
          alert(data.error);
        } else {
          setSlotResult(data.result);
          onUpdateUser({ points: data.newPoints });
          if (data.multiplier > 0) {
            setSlotMessage(`مبروك! ربحت ${data.winAmount} نقطة 🎉`);
          } else {
            setSlotMessage('حظ أوفر المرة القادمة 😢');
          }
        }
      }, 2000);
    } catch (e) {
      clearInterval(interval);
      setIsSpinning(false);
      alert('حدث خطأ');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewRoomImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="text-center py-8">جاري التحميل...</div>;

  if (activeRoom) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 p-6 relative overflow-hidden">
        <AnimatePresence>
          {giftNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/80 text-white px-8 py-6 rounded-3xl backdrop-blur-sm shadow-2xl"
            >
              <motion.div 
                animate={{ scale: [1, 1.5, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-6xl mb-4"
              >
                {giftNotification.icon}
              </motion.div>
              <p className="text-lg font-bold text-center">{giftNotification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Combo Button */}
        <AnimatePresence>
          {lastSentGift && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 50 }}
              className="fixed bottom-24 right-6 z-50"
            >
              <button
                onClick={() => sendGift(lastSentGift.receiver_id, lastSentGift.gift_id, lastSentGift.quantity)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-full shadow-2xl font-black text-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
              >
                <GiftIcon className="w-8 h-8 animate-bounce" />
                <span>إرسال مرة أخرى (x{lastSentGift.quantity})</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {activeRoom.image ? (
              <img src={activeRoom.image} alt="Room" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">{activeRoom.name}</h3>
              <p className="text-xs text-gray-500">المالك: {activeRoom.owner_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSlotGame(true)} className="bg-amber-100 text-amber-600 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-200">
              <Star className="w-4 h-4" />
              جوهر الحظ
            </button>
            {(user.id === activeRoom.owner_id || activeRoom.admins?.some((a: any) => a.id === user.id)) && (
              <select
                value={activeRoom.max_mics}
                onChange={(e) => changeMics(parseInt(e.target.value))}
                className="bg-gray-100 border-none rounded-xl text-sm font-bold px-3 py-2 focus:ring-0 cursor-pointer hover:bg-gray-200"
              >
                <option value={3}>3 مايكات</option>
                <option value={4}>4 مايكات</option>
                <option value={8}>8 مايكات</option>
              </select>
            )}
            <button onClick={() => {
              if (activeRoom.mics?.some((m: any) => m.id === user.id)) {
                const micIndex = activeRoom.mics.find((m: any) => m.id === user.id).mic_index;
                handleMic(micIndex, 'leave');
              }
              setActiveRoom(null);
            }} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: activeRoom.max_mics }).map((_, i) => {
            const micUser = activeRoom.mics?.find((m: any) => m.mic_index === i);
            return (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[120px]">
                {micUser ? (
                  <>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-200 mb-2 relative">
                      {micUser.avatar ? (
                        <img src={micUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {/* Audio indicator */}
                      {(remoteStreams[micUser.id] || micUser.id === user.id) && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-center truncate w-full">{micUser.name || 'مستخدم'}</span>
                    
                    {/* Audio Element for Remote Streams */}
                    {micUser.id !== user.id && remoteStreams[micUser.id] && (
                      <audio
                        autoPlay
                        playsInline
                        ref={(audio) => {
                          if (audio && audio.srcObject !== remoteStreams[micUser.id]) {
                            audio.srcObject = remoteStreams[micUser.id];
                          }
                        }}
                      />
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      {micUser.id !== user.id && (
                        <button onClick={() => setShowGifts(micUser.id)} className="p-1.5 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200">
                          <GiftIcon className="w-3 h-3" />
                        </button>
                      )}
                      {micUser.id === user.id && (
                        <button onClick={() => handleMic(i, 'leave')} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {(user.id === activeRoom.owner_id || activeRoom.admins?.some((a: any) => a.id === user.id)) && micUser.id !== user.id && (
                        <button onClick={() => handleMic(i, 'kick')} className="p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <button onClick={() => handleMic(i, 'take')} className="flex flex-col items-center text-gray-400 hover:text-indigo-600 transition-colors">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
                      <Mic className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold">مايك فارغ</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Slot Game Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 mb-8 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold flex items-center gap-2 text-indigo-900">
              <Star className="w-5 h-5 text-yellow-500" />
              جوهرة الحظ
            </h4>
            <button 
              onClick={() => setShowSlotGame(!showSlotGame)}
              className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-200"
            >
              {showSlotGame ? 'إخفاء اللعبة' : 'العب الآن'}
            </button>
          </div>

          <AnimatePresence>
            {showSlotGame && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl p-6 shadow-inner border border-indigo-50">
                  <div className="flex justify-center gap-4 mb-8">
                    {slotResult.map((symbol, idx) => (
                      <motion.div 
                        key={idx}
                        animate={isSpinning ? { y: [0, -20, 0], opacity: [1, 0.5, 1] } : {}}
                        transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.2, delay: idx * 0.1 }}
                        className="w-20 h-24 bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center text-5xl shadow-inner"
                      >
                        {symbol}
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      {[100, 1000, 5000].map(amount => (
                        <button
                          key={amount}
                          onClick={() => setSlotBet(amount)}
                          disabled={isSpinning}
                          className={`px-4 py-2 rounded-xl font-bold transition-all ${
                            slotBet === amount 
                              ? 'bg-indigo-600 text-white shadow-md scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {amount} نقطة
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={playSlotGame}
                      disabled={isSpinning || user.points < slotBet}
                      className="w-full max-w-xs bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 font-black text-lg py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSpinning ? 'جاري اللعب...' : 'العب الآن'}
                    </button>

                    {slotMessage && (
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`font-bold text-lg ${slotMessage.includes('مبروك') ? 'text-emerald-600' : 'text-gray-500'}`}
                      >
                        {slotMessage}
                      </motion.p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Room Admins Section */}
        <div className="bg-gray-50 rounded-3xl p-6 mb-8 border border-black/5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              مشرفي الغرفة
            </h4>
            {user.id === activeRoom.owner_id && (
              <button 
                onClick={() => {
                  const id = prompt('أدخل ID المستخدم لإضافته كمشرف:');
                  if (id) {
                    fetch(`/api/rooms/${activeRoom.id}/admins`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: parseInt(id), action: 'add' })
                    });
                  }
                }}
                className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-200"
              >
                + إضافة مشرف
              </button>
            )}
          </div>
          
          {activeRoom.admins && activeRoom.admins.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeRoom.admins.map((admin: any) => (
                <div key={admin.id} className="bg-white p-3 rounded-2xl flex items-center justify-between shadow-sm border border-black/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      {admin.avatar ? (
                        <img src={admin.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Users className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{admin.name || 'مستخدم'}</p>
                      <p className="text-[10px] text-gray-500 font-mono">ID: {admin.id}</p>
                    </div>
                  </div>
                  {user.id === activeRoom.owner_id && (
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من إزالة هذا المشرف؟')) {
                          fetch(`/api/rooms/${activeRoom.id}/admins`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: admin.id, action: 'remove' })
                          });
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm font-bold">
              لا يوجد مشرفين في هذه الغرفة
            </div>
          )}
        </div>

        {showGifts && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">إرسال هدية</h3>
                <button onClick={() => setShowGifts(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                <button
                  onClick={() => setGiftTab('normal')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${giftTab === 'normal' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  هدايا عادية
                </button>
                <button
                  onClick={() => setGiftTab('luck')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${giftTab === 'luck' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  هدايا الحظ
                </button>
                <button
                  onClick={() => setGiftTab('flag')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${giftTab === 'flag' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  أعلام الدول
                </button>
              </div>

              <div className="mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <span className="font-bold text-gray-700">الكمية:</span>
                <div className="flex gap-2">
                  {[1, 7, 27, 66, 177].map(qty => (
                    <button
                      key={qty}
                      onClick={() => setGiftQuantity(qty)}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${giftQuantity === qty ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {gifts.filter(g => g.type === giftTab).map(gift => (
                  <button
                    key={gift.id}
                    onClick={() => sendGift(showGifts, gift.id)}
                    className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center hover:bg-indigo-50 hover:ring-2 hover:ring-indigo-500 transition-all"
                  >
                    <span className="text-4xl mb-2">{gift.icon}</span>
                    <span className="text-xs font-bold text-gray-700 mb-1">{gift.name}</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">{gift.price} نقطة</span>
                    {gift.type === 'luck' && <span className="text-[10px] text-emerald-600 mt-1">هدية حظ!</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showSlotGame && (
          <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 max-w-md w-full border-4 border-amber-400 shadow-2xl relative">
              <button onClick={() => setShowSlotGame(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-2 flex items-center justify-center gap-2">
                  <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                  جوهر الحظ
                  <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
                </h3>
                <p className="text-indigo-200 text-sm font-bold">طابق الأشكال واربح أضعاف رهانك!</p>
              </div>

              <div className="bg-black/40 rounded-2xl p-6 mb-8 border-2 border-indigo-500/30">
                <div className="flex justify-center gap-4">
                  {slotResult.map((symbol, index) => (
                    <div 
                      key={index} 
                      className={`w-20 h-24 bg-gradient-to-b from-white to-gray-200 rounded-xl flex items-center justify-center text-5xl shadow-inner border-b-4 border-gray-300 ${isSpinning ? 'animate-pulse' : ''}`}
                      style={{ animationDuration: `${0.1 + index * 0.05}s` }}
                    >
                      {symbol}
                    </div>
                  ))}
                </div>
                {slotMessage && (
                  <div className={`mt-6 text-center font-bold text-lg ${slotMessage.includes('مبروك') ? 'text-emerald-400 animate-bounce' : 'text-rose-400'}`}>
                    {slotMessage}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-indigo-200 text-sm font-bold mb-3 text-center">اختر مبلغ الرهان:</label>
                  <div className="flex gap-3 justify-center">
                    {[100, 1000, 5000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setSlotBet(amount)}
                        disabled={isSpinning}
                        className={`px-4 py-2 rounded-xl font-black text-lg transition-all ${slotBet === amount ? 'bg-amber-400 text-indigo-900 scale-110 shadow-lg shadow-amber-400/50' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={playSlotGame}
                  disabled={isSpinning || user.points < slotBet}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-indigo-900 font-black text-2xl py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSpinning ? 'جاري اللعب...' : 'العب الآن!'}
                </button>
                
                <div className="text-center text-indigo-200 text-sm font-bold">
                  رصيدك الحالي: <span className="text-amber-400">{user.points}</span> نقطة
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (room.owner_name && room.owner_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black">الغرف الصوتية</h2>
        <div className="flex w-full sm:w-auto gap-3">
          <input
            type="text"
            placeholder="ابحث عن غرفة أو مستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:w-64 bg-white border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={() => setShowCreate(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 whitespace-nowrap">
            إنشاء غرفة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredRooms.map(room => (
          <div key={room.id} onClick={() => joinRoom(room.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 cursor-pointer hover:border-indigo-500 transition-colors flex items-center gap-4">
            {room.image ? (
              <img src={room.image} alt="Room" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            )}
            <div>
              <h4 className="font-bold text-gray-900">{room.name}</h4>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500" />
                {room.owner_name || 'مستخدم'}
              </p>
            </div>
          </div>
        ))}
        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500 font-bold">لا توجد غرف مطابقة للبحث</div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-6">إنشاء غرفة جديدة</h3>
            <form onSubmit={createRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم الغرفة</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">صورة الغرفة</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm" />
                {newRoomImage && <img src={newRoomImage} alt="Preview" className="mt-2 w-16 h-16 rounded-xl object-cover" />}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">إنشاء</button>
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
