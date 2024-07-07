const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const {
    buscarOcrearChat,
    enviarMensaje,
    obtenerChats,
    obtenerMensajesDeBase
} = require('./src/controllers/generalController');
const {
    recibirMensajesDeRabbitMQ
} = require('./src/controllers/rabbitMqController');

const app = express();
app.use(cors());  // <---- Habilitar CORS
app.use(express.json());

const mongoUrl = 'mongodb://localhost:27017/chatApp';
mongoose.connect(mongoUrl)
    .then(() => console.log('Conectado a MongoDB'))
    .catch((err) => console.error('Error al conectar a MongoDB:', err.message));


const corsOptions = {
    origin: 'http://localhost:4200',  // Cambia esto al URL/puerto de tu frontend si es necesario
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


app.post('/notificacions', buscarOcrearChat);
app.post('/mensaje', enviarMensaje);
app.get('/chat/:chatId', obtenerChats);
app.post('/mensajesBase', obtenerMensajesDeBase);

const server = app.listen(8080, () => {
    console.log('Servidor de Express escuchando en el puerto 8080');
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        try {
            const { chatId } = JSON.parse(message);
            console.log("🚀 ~ ws.on ~ message:", message)

            if (typeof chatId !== 'string' || chatId.length > 255) {
                console.warn(`Invalid chatId received: ${chatId}, assigning default value.`);
                chatId = 'default_chat';
            }

            await recibirMensajesDeRabbitMQ(chatId, ws);
        } catch (error) {
            console.error(`Error processing WebSocket message: ${error.message}`);
            ws.send(JSON.stringify({ error: error.message }));
        }
    });
});
