import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User as UserIcon, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface SupportConversation {
  user_id: number;
  user_name: string;
  user_phone: string;
  user_avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface SupportMessage {
  id: number;
  user_id: number;
  sender_type: 'user' | 'admin';
  message: string;
  is_read: number;
  created_at: string;
}

export default function AdminSupport() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/support/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/support/messages/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Update unread count locally
        setConversations(prev => prev.map(c => c.user_id === userId ? { ...c, unread_count: 0 } : c));
      }
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_SUPPORT_MESSAGE') {
        fetchConversations();
        if (selectedUserId && data.message.user_id === selectedUserId) {
          setMessages(prev => [...prev, data.message]);
          // Mark as read immediately if we are viewing this conversation
          if (data.message.sender_type === 'user') {
             fetch(`/api/admin/support/messages/${selectedUserId}`);
          }
        }
      }
    };

    return () => ws.close();
  }, [selectedUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/messages/${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchConversations(); // Update last message in list
      }
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden flex h-[600px]">
      {/* Conversations List */}
      <div className="w-1/3 border-l border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h3 className="font-bold text-gray-900">المحادثات</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => setSelectedUserId(conv.user_id)}
                className={`w-full text-right p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3 ${selectedUserId === conv.user_id ? 'bg-emerald-50/50' : ''}`}
              >
                <div className="relative shrink-0">
                  {conv.user_avatar ? (
                    <img src={conv.user_avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{conv.user_name || conv.user_phone}</h4>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(conv.last_message_time).toLocaleDateString('ar-IQ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
              {selectedUser?.user_avatar ? (
                <img src={selectedUser.user_avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900">{selectedUser?.user_name || selectedUser?.user_phone}</h3>
                <p className="text-xs text-gray-500">{selectedUser?.user_phone}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-2xl ${
                        isAdmin
                          ? 'bg-emerald-600 text-white rounded-tl-none'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tr-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <span
                        className={`text-[10px] mt-1 block ${
                          isAdmin ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('ar-IQ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-2 text-sm transition-all"
                  dir="rtl"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || loading}
                  className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-200" />
            <p>اختر محادثة للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
}
