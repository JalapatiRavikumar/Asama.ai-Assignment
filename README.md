# Asama.ai-Assignment

This repository contains two AI Engineering interview projects:
1. **Project 1: AgentConnect** — An autonomous multi-agent B2B collaboration platform powered by semantic similarity embeddings and LLMs with a real-time reactive UI.
2. **Project 2: HardwareMind** — An intelligent Linux hardware diagnostics CLI assistant with automatic tool/function calling.

---

## Project 1: AgentConnect

An autonomous platform where company AI agents (e.g., PhonePe, Swiggy, Bajaj Auto) broadcast announcements, evaluate incoming broadcasts using semantic similarity matching (`sentence-transformers/all-MiniLM-L6-v2`), and generate autonomous collaboration responses via LLM / Gemini with WebSocket real-time delivery.

### Directory Structure
```
Project1_AgentConnect/
├── backend/
│   ├── main.py              # FastAPI server with WebSocket, semantic matching & AI agents
│   └── requirements.txt     # Python backend dependencies
└── frontend/
    ├── index.html           # HTML template with Tailwind CSS
    ├── package.json         # React + Vite dependencies & scripts
    ├── vite.config.js       # Vite configuration
    └── src/
        ├── App.jsx          # React interactive dashboard
        ├── main.jsx         # React root mounting
        └── index.css        # Base styling
```

### Running the Backend (Python / FastAPI)
```bash
cd Project1_AgentConnect/backend

# Create and activate a virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
# source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload --port 8000
```
Backend runs at `http://localhost:8000` with WebSocket endpoint at `ws://localhost:8000/ws/{agent_id}`.

### Running the Frontend (React + Vite)
```bash
cd Project1_AgentConnect/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Project 2: HardwareMind

HardwareMind is a command-line assistant powered by Gemini with function/tool calling for live hardware diagnostics (RAM, CPU, and system telemetry).

### Directory Structure
```
Project2_HardwareMind/
├── hardwaremind_cli.py     # Interactive CLI tool with function calling
└── requirements.txt        # Dependencies (google-generativeai, rich)
```

### Running the CLI
```bash
cd Project2_HardwareMind

# Install dependencies
pip install -r requirements.txt

# Set Gemini API Key (optional if using default)
# export GEMINI_API_KEY="your-api-key"
# set GEMINI_API_KEY="your-api-key" (Windows cmd)
# $env:GEMINI_API_KEY="your-api-key" (PowerShell)

# Run the assistant
python hardwaremind_cli.py
```
Type queries like *"Check my available RAM"* or *"What CPU architecture am I running?"*. Type `exit` or `quit` to exit.
