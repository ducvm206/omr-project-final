// ============================================================
// WebSocket - OMR Control Panel
// ============================================================

(function() {
    const WS_URL = 'ws://' + window.location.host + '/eg/ws';
    let ws = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;
    const RECONNECT_DELAY = 3000;

    function connect() {
        try {
            ws = new WebSocket(WS_URL);

            ws.onopen = function() {
                console.log('[WS] Connected');
                reconnectAttempts = 0;
                updateStatus(true);
            };

            ws.onclose = function() {
                console.log('[WS] Disconnected');
                updateStatus(false);
                scheduleReconnect();
            };

            ws.onerror = function(err) {
                console.log('[WS] Error:', err);
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (e) {
                    console.log('[WS] Parse error:', e);
                }
            };

        } catch (e) {
            console.log('[WS] Connection failed:', e);
            scheduleReconnect();
        }
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        if (reconnectAttempts >= MAX_RECONNECT) {
            console.log('[WS] Max reconnect attempts reached');
            return;
        }
        reconnectAttempts++;
        console.log('[WS] Reconnecting in ' + (RECONNECT_DELAY / 1000) + 's (' + reconnectAttempts + '/' + MAX_RECONNECT + ')');
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            connect();
        }, RECONNECT_DELAY);
    }

    function updateStatus(online) {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        if (dot) {
            dot.className = 'dot' + (online ? ' online' : ' offline');
        }
        if (text) {
            text.textContent = online ? 'ONLINE' : 'OFFLINE';
        }
    }

    function handleMessage(data) {
        // Pass to main app if it's listening
        if (window.onWebSocketMessage) {
            window.onWebSocketMessage(data);
        }
    }

    // ---- Public API ----
    window.ws = {
        connect: connect,
        send: function(data) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            } else {
                console.log('[WS] Not connected');
            }
        },
        isConnected: function() {
            return ws && ws.readyState === WebSocket.OPEN;
        }
    };

    // ---- Auto-connect ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connect);
    } else {
        connect();
    }

})();