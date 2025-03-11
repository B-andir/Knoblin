const WebSocket = require('ws');

let ws = null;
let prefix = "";

// A map of eventName -> array of callback functions
const handlers = {};
// A queue of 'messages' that failed to send due to a closed event server
const pendingQueue = [];

// Connect to the WebSocket event server.
function connectToEventServer(_prefix) {
    prefix = '[' + _prefix + ' EventClient]';

    ws = new WebSocket('ws://localhost:3001', {
        headers: {
            'x-auth-token': process.env.EVENT_SERVER_SECRET
        }
    });

    ws.on('open', () => {
        console.log(`${prefix} Connected to event server`);

        flushPendingQueue();
    });

    ws.on('message', (data) => {
        handleIncomingMessage(data);
    });

    ws.on('close', () => {
        console.log(`${prefix} Disconnected from event server`);
        delete ws;
    });
}

// Parse incoming messages and call the appropriate callback functions
function handleIncomingMessage(rawData) {
    let msg;
    try {
        msg = JSON.parse(rawData);
    } catch (e) {
        console.error(`${prefix} Invalid JSON: ${rawData}`);
        return;
    }

    // We expect messages in the form:
    // { type: 'event', eventName: 'Foo', payload: {...} }
    if (msg.type === 'event') {
        const { eventName, payload } = msg;
        if (handlers[eventName]) {
            handlers[eventName].forEach((cb) => {
                cb(payload);
            });
        }
    }
}

function flushPendingQueue() {
    console.log(`${prefix} Flush message queue`);
    while (pendingQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
        const msg = pendingQueue.shift();
        ws.send(JSON.stringify(msg));
    }
    console.log(`${prefix} Message queue flushed!`);
}

// Helper to send a message
function sendMessage(msg) {
    console.log(`${prefix} Attempting to send a message`);
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`${prefix} WebSocket is open, sending message`);
        ws.send(JSON.stringify(msg));
    } else {
        console.log(`${prefix} WebSocket is closed, queing the message`);
        pendingQueue.push(msg);
    }
}

// Subscribe to an event
function subscribeToServer(eventName) {
    sendMessage({ type: 'subscribe', eventName });
}

// Unsubscribe from an event
function unsubscribeFromServer(eventName) {
    sendMessage({ type: 'unsubscribe', eventName });
}

// ------
// Subscribe to an event name with a callback function
// When that event is broadcast by the server, the callback is called
function on(eventName, callback) {
    if (!handlers[eventName]) {
        handlers[eventName] = [];
        subscribeToServer(eventName);
    }
    handlers[eventName].push(callback);

    // Returns callback to allow for using eventId-like structure
    return callback;
}

// Unsubscribe a specific callback from an event
function off(eventName, callback) {
    if (!handlers[eventName]) return;
    const idx = handlers[eventName].indexOf(callback);
    if (idx !== -1) {
        handlers[eventName].splice(idx, 1);
    }

    // If no more listeners for that event, unsubscribe from the server
    if (handlers[eventName].length === 0) {
        unsubscribeFromServer(eventName);
        delete handlers[eventName];
    }
}

// Emit an event to the server for broadcasting to all listners
function emit(eventName, payload) {
    sendMessage({ type: 'emit', eventName, payload});
}

module.exports = {
    connectToEventServer,
    on,
    off,
    emit
}