const express = require('express');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const {
    buscarOcrearChat,
    enviarMensaje,
    obtenerChats
} = require('./src/controllers/generalController');
const {
    recibirMensajesDeRabbitMQ
} = require('./src/controllers/rabbitMqController');

const app = express();
app.use(express.json());

const mongoUrl = 'mongodb://localhost:27017/chatApp';
mongoose.connect(mongoUrl)
    .then(() => console.log('Conectado a MongoDB'))
    .catch((err) => console.error('Error al conectar a MongoDB:', err.message));

app.post('/chat', buscarOcrearChat);
app.post('/mensaje', enviarMensaje);
app.get('/chat/:chatId', obtenerChats);

const server = app.listen(8080, () => {
    console.log('Servidor de Express escuchando en el puerto 8080');
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const { chatId } = JSON.parse(message);
        await recibirMensajesDeRabbitMQ(chatId, ws);
    });
});
