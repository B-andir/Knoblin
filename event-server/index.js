const WebSocket = require('ws');
require('dotenv').config();

const HOST = '127.0.0.1';  // localhost
const PORT = 3001;

const server = require('http').createServer();
server.listen(PORT, HOST, () => {
    console.log(`[EventServer] Server listening on ws://${HOST}:${PORT}`);
});
const wss = new WebSocket.Server({ port: PORT }, () => {
});

// We store subscriptions in a Map:
//   eventName -> Set of wsConnections that subscribed
const subscriptions = new Map();

// Helper to add a subscription
function subscribe(ws, eventName) {
    if (!subscriptions.has(eventName)) {
        subscriptions.set(eventName, new Set());
    }

    const subscribers = subscriptions.get(eventName);
    subscribers.add(ws);
    console.log(`[EventServer] A client subscribed to event ${eventName} ...`);
}

// Helper to remove a subscription
function unsubscribe(ws, eventName) {
    console.log(`[EventServer] A client is attempting to unsubscribe from event ${eventName} ...`);
    if (!subscriptions.has(eventName)) {
        console.log(`[EventServer] No events of name ${eventName} found in subscriptions map`);
        return;
    }
    
    const subscribers = subscriptions.get(eventName);
    subscribers.delete(ws);
    console.log(`[EventServer] A client unsubscribed from event ${eventName} ...`);

    // Clean up empty events from map to save memory
    if (subscribers.size === 0) {
        subscriptions.delete(eventName);
    }
}

// Emit an event to all subscribers
function emitEvent(eventName, data) {
    console.log(`[EventServer] Broadcasting event ${eventName} ...`);
    const subscribers = subscriptions.get(eventName);
    if (!subscribers) {
        console.log(`[EventServer] Aborting ${eventName} broadcast as there are no listeners subscribed to the event`);
        return;
    }

    let numOfCalls = 0;
    for (const ws of subscribers) {
        ws.send(JSON.stringify({
            type: 'event',  // 'event' indicates it's a broadcast
            eventName,
            payload: data
        }));

        numOfCalls++;
    }

    console.log(`[EventServer] Broadcasted event ${eventName} to ${numOfCalls} listeners`);
}

// When a client connects...
wss.on('connection', (ws, req) => {
    const token = req.headers['x-auth-token'];
    if (token !== process.env.EVENT_SERVER_SECRET) {
        ws.close(4001, 'Unauthorized');
        console.log('[EventServer] Connection attempt denied: No or wrong secret');
        return;
    }

    console.log('[EventServer] New client connected to event server');

    // Clean up subscriptions if the client disconnects
    ws.on('close', () => {
        console.log('[EventServer] Client disconnected from event server');
        for (const [eventName, subscribers] of subscriptions.entries()) {
            if (subscribers.has(ws)) {
                subscribers.delete(ws);

                // Clean up empty events from map to save memory
                if (subscribers.size === 0) {
                    subscriptions.delete(eventName);
                }
            }
        }
    });

    // Handle incoming messages from this client
    ws.on('message', (message) => {
        console.log('[EventServer] Incoming message');
        let msg;
        try {
            msg = JSON.parse(message);
        } catch (e) {
            console.error('[EventServer] Invalid JSON:', e);
            return;
        }

        console.log('[EventServer] Incoming message was parsed successfully');

        const { type, eventName, payload } = msg;
        switch (type) {
            case 'subscribe':
                subscribe(ws, eventName);
                break;

            case 'unsubscribe':
                unsubscribe(ws, eventName);
                break;
            case 'emit':
                console.log(`[EventServer] Emit event ${eventName}`);
                emitEvent(eventName, payload)
                break;
            default:
                console.warn('Unknown message type: ', type)
                break;
        }
    });
})