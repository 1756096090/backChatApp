const WebSocket = require('ws');
const {
    getRabbitMQChannel,
    assertQueue,
    sendMessageToQueue,
    closeChannel,
    recibirMensajesDeRabbitMQ
} = require('./rabbitMqController');
const clients = new Map();

function handleJoinMessage(ws, chatId) {
    if (!clients.has(chatId)) {
        clients.set(chatId, new Set());
    }
    clients.get(chatId).add(ws);
    recibirMensajesDeRabbitMQ(chatId, ws).catch(console.error);
}

async function handleMessage(channel, chatQueue, fullMessage) {
    await assertQueue(channel, chatQueue);
    await sendMessageToQueue(channel, chatQueue, fullMessage);
}

function handleCloseConnection(ws) {
    clients.forEach((set, chatId) => {
        if (set.has(ws)) {
            set.delete(ws);
        }
    });
}

async function onWebSocketMessage(ws, message) {
    const { type, chatId, sender, recipient, text } = JSON.parse(message);

    if (type === 'join') {
        handleJoinMessage(ws, chatId);
    } else if (type === 'message') {
        const chatQueue = `chat_${chatId}`;
        const fullMessage = JSON.stringify({ sender, text });

        let channel;
        try {
            channel = await getRabbitMQChannel();
            await handleMessage(channel, chatQueue, fullMessage);
        } catch (error) {
            console.error(`Error al enviar mensaje a RabbitMQ en la cola '${chatQueue}':`, error.message);
        } finally {
            await closeChannel(channel).catch(console.error);
        }
    }
}

function onWebSocketConnection(ws) {
    ws.on('message', (message) => onWebSocketMessage(ws, message));
    ws.on('close', () => handleCloseConnection(ws));
}

module.exports = {
    onWebSocketConnection
};
