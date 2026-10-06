# app/websocket_manager.py
"""
WebSocket connection manager for real-time updates.
"""

import asyncio
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.request_history: List[Dict] = []
        self.log_history: List[Dict] = []
        self.MAX_HISTORY = 200
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)
    
    def add_request(self, endpoint: str, method: str, status: int, duration: float, details: dict = None):
        """Add a request to history and broadcast it."""
        entry = {
            "time": datetime.now().isoformat(),
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "duration": round(duration * 1000, 2),
            "details": details or {}
        }
        self.request_history.insert(0, entry)
        if len(self.request_history) > self.MAX_HISTORY:
            self.request_history.pop()
        
        # Broadcast to WebSocket clients
        asyncio.create_task(self.broadcast({
            "type": "request",
            "data": entry
        }))
        
        return entry
    
    def add_log(self, level: str, message: str):
        """Add a log entry and broadcast it."""
        entry = {
            "time": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self.log_history.insert(0, entry)
        if len(self.log_history) > self.MAX_HISTORY:
            self.log_history.pop()
        
        # Broadcast to WebSocket clients
        asyncio.create_task(self.broadcast({
            "type": "log",
            "data": entry
        }))
    
    def get_requests(self, limit: int = 50) -> List[Dict]:
        return self.request_history[:limit]
    
    def get_logs(self, limit: int = 200, level: str = None) -> List[Dict]:
        logs = self.log_history[:limit]
        if level and level != "all":
            logs = [log for log in logs if log.get("level") == level.upper()]
        return logs