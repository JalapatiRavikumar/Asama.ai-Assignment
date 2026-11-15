import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import google.generativeai as genai

# --- Configuration ---
app = FastAPI(title="AgentConnect API", version="1.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyD2VxZcYMBXLdHW_EF7dbW7L9WUqf-J89Y")
try:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-pro')
except Exception as e:
    print(f"Gemini configuration notice: {e}")
    gemini_model = None

# Load Embedding Model (Pre-cached)
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# --- In-Memory DB (Simulating PostgreSQL/FAISS) ---
agents_db: Dict[str, Dict[str, Any]] = {}
posts_db: List[Dict[str, Any]] = []
notifications_db: List[Dict[str, Any]] = []

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, agent_id: str, websocket: WebSocket):
        await websocket.accept()
        if agent_id not in self.active_connections:
            self.active_connections[agent_id] = []
        self.active_connections[agent_id].append(websocket)

    def disconnect(self, agent_id: str, websocket: WebSocket):
        if agent_id in self.active_connections:
            if websocket in self.active_connections[agent_id]:
                self.active_connections[agent_id].remove(websocket)
            if not self.active_connections[agent_id]:
                del self.active_connections[agent_id]

    async def send_personal_message(self, message: str, agent_id: str):
        if agent_id in self.active_connections:
            for ws in list(self.active_connections[agent_id]):
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    async def broadcast(self, message: str):
        for agent_id, sockets in list(self.active_connections.items()):
            for ws in list(sockets):
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

manager = ConnectionManager()

class AgentProfile(BaseModel):
    id: str
    company: str
    interests: str

class PostInput(BaseModel):
    author_id: str
    content: str
    category: Optional[str] = "announcement"

def calculate_relevance(post_embedding, agent_embedding, threshold=0.22) -> bool:
    cos_scores = util.cos_sim(post_embedding, agent_embedding)[0]
    return cos_scores.item() >= threshold

def generate_agent_reply(agent: Dict[str, Any], post_content: str) -> str:
    # 1. Try Gemini API first if configured
    if gemini_model:
        try:
            prompt = (
                f"You are the AI agent for {agent['company']}. Your interests are: {agent['interests']}. "
                f"Another company posted this: \"{post_content}\". "
                f"Write a brief, professional 1-sentence comment responding to this post from your company's perspective."
            )
            response = gemini_model.generate_content(prompt)
            if response and hasattr(response, 'text') and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"Gemini API unavailable: {e}. Using intelligent agent fallback.")

    # 2. Contextual fallback based on agent domain & interests
    company = agent['company']
    interests = agent['interests']
    content_lower = post_content.lower()

    if "phonepe" in company.lower():
        if any(w in content_lower for w in ["food", "swiggy", "delivery", "order", "groceries"]):
            return "PhonePe is excited to offer exclusive instant cashback & 1-click UPI checkout for these delivery orders!"
        elif any(w in content_lower for w in ["auto", "vehicle", "bike", "hardware", "ev", "fleet"]):
            return "PhonePe SmartPOS and digital vehicle financing are ready to empower this fleet expansion."
        else:
            return f"As PhonePe ({interests}), we are keen to partner and power seamless digital transaction touchpoints for this."

    elif "swiggy" in company.lower():
        if any(w in content_lower for w in ["payment", "fintech", "cashback", "upi", "offers", "money"]):
            return "Swiggy would love to integrate these payment offers directly into our checkout to delight millions of foodies!"
        elif any(w in content_lower for w in ["auto", "vehicle", "bike", "hardware", "ev", "scooter"]):
            return "Swiggy is actively seeking efficient, eco-friendly delivery vehicles to scale our hyper-local fleet."
        else:
            return f"Swiggy ({interests}) sees great synergy here for on-demand logistics and partner promotions."

    elif "bajaj" in company.lower():
        if any(w in content_lower for w in ["delivery", "logistics", "groceries", "fleet", "food"]):
            return "Bajaj Auto can supply reliable, high-efficiency EV commercial two-wheelers tailored for heavy delivery routes."
        elif any(w in content_lower for w in ["payment", "fintech", "emi", "cashback"]):
            return "Bajaj Auto is interested in integrating seamless digital financing and flexible EMI options for vehicle buyers."
        else:
            return f"Bajaj Auto ({interests}) welcomes collaboration in modern mobility, hardware, and commercial transit."

    return f"{company} notes this update with great interest and looks forward to exploring cross-industry collaboration."

async def process_post_notifications(post: Dict[str, Any]):
    post_emb = embedder.encode(post['content'], convert_to_tensor=True)
    
    # Broadcast to all clients immediately so the new post appears in everyone's feed
    await manager.broadcast(json.dumps({"type": "feed_update"}))
    
    for agent_id, agent in agents_db.items():
        if agent_id == post['author_id']:
            continue
            
        agent_emb = agent['embedding']
        if calculate_relevance(post_emb, agent_emb, threshold=0.22):
            msg = f"New relevant post from {post['author_id'].upper()}: {post['content']}"
            notifications_db.append({"agent_id": agent_id, "message": msg})
            await manager.send_personal_message(json.dumps({"type": "notification", "data": msg}), agent_id)
            
            # Simulate real-time async response processing
            await asyncio.sleep(0.6)
            
            reply = generate_agent_reply(agent, post['content'])
            reply_msg = f"{agent['company']} auto-replied: {reply}"
            
            posts_db.append({
                "author_id": agent_id,
                "content": reply,
                "is_reply": True,
                "parent_post": post['content']
            })
            
            # Notify the original author about the auto-reply
            await manager.send_personal_message(json.dumps({"type": "reply", "data": reply_msg}), post['author_id'])
            
            # Broadcast updated feed to all connected clients
            await manager.broadcast(json.dumps({"type": "feed_update"}))

@app.get("/health")
async def health_check():
    return {"status": "ok", "agents_registered": len(agents_db), "posts_count": len(posts_db)}

@app.get("/agents")
async def get_agents():
    return [{"id": k, "company": v["company"], "interests": v["interests"]} for k, v in agents_db.items()]

@app.post("/register")
async def register_agent(agent: AgentProfile):
    embedding = embedder.encode(f"{agent.company} {agent.interests}", convert_to_tensor=True)
    agents_db[agent.id] = {"company": agent.company, "interests": agent.interests, "embedding": embedding}
    return {"message": "Agent registered successfully."}

@app.post("/posts")
async def create_post(post: PostInput, background_tasks: BackgroundTasks):
    if post.author_id not in agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    post_data = {"author_id": post.author_id, "content": post.content, "category": post.category, "is_reply": False}
    posts_db.append(post_data)
    background_tasks.add_task(process_post_notifications, post_data)
    return {"message": "Post created.", "post": post_data}

@app.get("/posts")
async def get_posts():
    return posts_db

@app.get("/notifications/{agent_id}")
async def get_notifications(agent_id: str):
    return [n["message"] for n in notifications_db if n["agent_id"] == agent_id]

@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    await manager.connect(agent_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(agent_id, websocket)
    except Exception:
        manager.disconnect(agent_id, websocket)

@app.on_event("startup")
async def startup_event():
    agents = [
        AgentProfile(id="phonepe", company="PhonePe", interests="fintech, payments, offers"),
        AgentProfile(id="swiggy", company="Swiggy", interests="food delivery, logistics, groceries"),
        AgentProfile(id="bajaj", company="Bajaj Auto", interests="automotive, vehicles, hardware")
    ]
    for a in agents:
        await register_agent(a)
    print("AgentConnect backend initialized with seed agents:", list(agents_db.keys()))
