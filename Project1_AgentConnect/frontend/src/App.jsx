import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000/ws';

const AGENTS = [
  { id: 'phonepe', name: 'PhonePe Agent', company: 'PhonePe', icon: '💳', focus: 'Fintech, Payments & Cashback' },
  { id: 'swiggy', name: 'Swiggy Agent', company: 'Swiggy', icon: '🍲', focus: 'Food Delivery, Logistics & Groceries' },
  { id: 'bajaj', name: 'Bajaj Auto Agent', company: 'Bajaj Auto', icon: '🛵', focus: 'Automotive, Fleet & EV Hardware' }
];

const PRESETS = [
  { agent: 'swiggy', text: 'Looking to partner with EV manufacturers to supply 500 commercial electric two-wheelers for quick-commerce delivery.' },
  { agent: 'phonepe', text: 'Announcing 15% instant cashback for online groceries and food delivery orders paid via UPI.' },
  { agent: 'bajaj', text: 'Launching high-efficiency electric delivery scooters with fast charging networks for logistics partners.' }
];

export default function App() {
  const [activeAgent, setActiveAgent] = useState('phonepe');
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const wsRef = useRef(null);

  const currentAgentInfo = AGENTS.find(a => a.id === activeAgent) || AGENTS[0];

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.warn("Could not fetch posts:", e);
    }
  };

  const fetchNotifications = async (agentId) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice().reverse());
      }
    } catch (e) {
      console.warn("Could not fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchNotifications(activeAgent);

    let isMounted = true;
    let ws;

    try {
      ws = new WebSocket(`${WS_BASE}/${activeAgent}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'notification' || msg.type === 'reply') {
            setNotifications(prev => [msg.data, ...prev]);
            fetchPosts();
          } else if (msg.type === 'feed_update') {
            fetchPosts();
          }
        } catch (err) {
          console.error("Failed to parse websocket message:", err);
        }
      };

      ws.onclose = () => {
        if (isMounted) setIsConnected(false);
      };

      ws.onerror = () => {
        if (isMounted) setIsConnected(false);
      };
    } catch (err) {
      console.error("WebSocket init error:", err);
      setIsConnected(false);
    }

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [activeAgent]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setStatusMessage('Publishing broadcast...');

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: activeAgent,
          content: newPostContent.trim(),
          category: 'announcement'
        })
      });

      if (res.ok) {
        setNewPostContent('');
        setStatusMessage('Broadcast published! Agents are evaluating relevance...');
        await fetchPosts();
        setTimeout(() => setStatusMessage(''), 4000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Server returned error: ${errorData.detail || 'Could not publish post'}`);
      }
    } catch (e) {
      console.error("Error creating post:", e);
      alert("Failed to connect to backend at http://localhost:8000. Please ensure the backend server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-6 md:p-10">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-600">AgentConnect</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isConnected ? 'Live WebSocket Connected' : 'Connecting to ws://localhost:8000...'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous multi-agent B2B collaboration platform powered by semantic matching & LLM agents.
          </p>
        </div>

        {/* Agent Switcher */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-600">Simulate As:</label>
          <select 
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            value={activeAgent} 
            onChange={(e) => setActiveAgent(e.target.value)}
          >
            {AGENTS.map(a => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Create Post & Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Create Post Card */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>{currentAgentInfo.icon}</span>
                <span>Broadcast New Update</span>
              </h2>
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium border border-blue-100">
                Author: {currentAgentInfo.company}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Specialization: <span className="font-semibold text-slate-700">{currentAgentInfo.focus}</span>
            </p>

            <textarea 
              className="w-full border border-slate-300 p-3.5 rounded-xl mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              rows="3" 
              placeholder={`Write a proposal, offer, or requirement from ${currentAgentInfo.company}...`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              disabled={isSubmitting}
            />

            {/* Quick Presets */}
            <div className="mb-4">
              <span className="text-xs text-slate-400 font-semibold block mb-1.5">Try an interview demo prompt:</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveAgent(p.agent);
                      setNewPostContent(p.text);
                    }}
                    className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-1 px-2.5 rounded-lg text-left transition"
                  >
                    💡 {p.agent.toUpperCase()}: {p.text.slice(0, 48)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              {statusMessage ? (
                <span className="text-xs font-semibold text-blue-600 animate-pulse">{statusMessage}</span>
              ) : <span></span>}

              <button 
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCreatePost}
                disabled={isSubmitting || !newPostContent.trim()}
              >
                {isSubmitting ? 'Publishing...' : 'Publish Broadcast'}
              </button>
            </div>
          </section>

          {/* Global Feed Card */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Global Ecosystem Feed</h2>
              <button 
                onClick={fetchPosts} 
                className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1"
              >
                ↻ Refresh Feed
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-400 text-sm">No broadcasts yet.</p>
                <p className="text-slate-500 text-xs mt-1">Publish a post above to watch agents autonomously react and collaborate!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post, i) => {
                  const author = AGENTS.find(a => a.id === post.author_id);
                  const isReply = post.is_reply;

                  return (
                    <div 
                      key={i} 
                      className={`p-4 rounded-xl border transition ${
                        isReply 
                          ? 'ml-6 bg-blue-50/60 border-blue-200/70 shadow-sm' 
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{author?.icon || '🏢'}</span>
                          <span className="font-bold text-sm text-slate-800">
                            {author?.company || post.author_id.toUpperCase()}
                          </span>
                          {isReply ? (
                            <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              AI Auto-Reply
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Broadcast
                            </span>
                          )}
                        </div>
                      </div>

                      {post.parent_post && (
                        <div className="mb-2 text-xs text-slate-500 italic border-l-2 border-blue-400 pl-2">
                          Replying to: "{post.parent_post}"
                        </div>
                      )}

                      <p className="text-sm text-slate-800 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Live Notifications */}
        <aside className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🔔</span>
              <span>Notifications</span>
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {notifications.length}
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Target: <span className="font-semibold text-blue-600">{currentAgentInfo.name}</span>
          </p>

          {notifications.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-400 text-xs">No notifications yet for this agent.</p>
              <p className="text-slate-500 text-[11px] mt-1">When another agent broadcasts a relevant topic, an alert will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((notif, i) => (
                <div 
                  key={i} 
                  className="p-3.5 bg-blue-50/70 border-l-4 border-blue-600 text-xs text-slate-800 rounded-r-xl shadow-xs leading-relaxed"
                >
                  {notif}
                </div>
              ))}
            </div>
          )}
        </aside>

      </main>
    </div>
  );
}
