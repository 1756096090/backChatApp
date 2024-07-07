const { connect: connectAMQP } = require('amqplib');
const Chat = require('../models/chat');
const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
let rabbitmqConnection;

async function connectRabbitMQ() {
    try {
        const connection = await connectAMQP(RABBITMQ_URL);
        console.log('Conectado a RabbitMQ.');
        return connection;
    } catch (error) {
        console.error('Error al conectar con RabbitMQ:', error.message);
        throw error;
    }
}

async function getRabbitMQChannel() {
    try {
        if (!rabbitmqConnection) {
            rabbitmqConnection = await connectRabbitMQ();
        }
        return await rabbitmqConnection.createChannel();
    } catch (error) {
        console.error('Error al crear el canal de RabbitMQ:', error.message);
        throw error;
    }
}

async function assertQueue(channel, queueName) {
    try {
        await channel.assertQueue(queueName, { durable: true });
    } catch (error) {
        console.error(`Error al asegurar la cola '${queueName}' en RabbitMQ:`, error.message);
        throw error;
    }
}

async function sendMessageToQueue(channel, queueName, mensaje) {
    try {
        await channel.sendToQueue(queueName, Buffer.from(mensaje), { persistent: true });
        console.log(`Mensaje enviado a RabbitMQ en la cola '${queueName}':`, mensaje);
    } catch (error) {
        console.error(`Error al enviar mensaje a la cola '${queueName}' en RabbitMQ:`, error.message);
        throw error;
    }
}

async function closeChannel(channel) {
    try {
        if (channel) await channel.close();
    } catch (closeError) {
        console.error('Error al cerrar el canal de RabbitMQ:', closeError.message);
        throw closeError;
    }
}

async function recibirMensajesDeRabbitMQ(queueName, ws) {
    let channel;
    try {
        channel = await getRabbitMQChannel();
        await assertQueue(channel, queueName);

        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const messageContent = JSON.parse(msg.content.toString());
                const { sender, text } = messageContent;

                // Guardar el mensaje en MongoDB
                const chat = await Chat.findOne({ chatId: queueName });
                if (chat) {
                    chat.chats.push({ usuario: sender, mensaje: text, fecha: new Date() });
                    await chat.save();
                }

                // Enviar el mensaje al WebSocket
                ws.send(JSON.stringify(messageContent));
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error(`Error al recibir mensajes de RabbitMQ en la cola '${queueName}':`, error.message);
        throw error;
    }
}

module.exports = {
    connectRabbitMQ,
    getRabbitMQChannel,
    assertQueue,
    sendMessageToQueue,
    closeChannel,
    recibirMensajesDeRabbitMQ
};
