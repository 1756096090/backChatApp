const Chat = require('../models/chat');
const {
    getRabbitMQChannel,
    assertQueue,
    sendMessageToQueue,
    closeChannel
} = require('./rabbitMqController');

async function buscarOcrearChat(req, res) {
    const { usuario1, usuario2 } = req.body;

    if (!usuario1 || !usuario2) {
        res.status(400).json({ error: 'Ambos usuarios deben ser proporcionados' });
        return;
    }

    const chatId = `chat_${Math.min(usuario1, usuario2)}_${Math.max(usuario1, usuario2)}`;
    let chat;

    let channel;
    try {
        channel = await getRabbitMQChannel();
        await assertQueue(channel, chatId);

        const msg = await new Promise((resolve, reject) => {
            channel.consume(chatId, (msg) => {
                if (msg !== null) {
                    resolve(msg);
                } else {
                    resolve(null);
                }
            }, { noAck: true });
        });

        if (msg) {
            console.log('Chat encontrado en RabbitMQ.');
            chat = JSON.parse(msg.content.toString());
        } else {
            console.log('Chat no encontrado en RabbitMQ.');
        }
    } catch (error) {
        console.error(`Error al buscar chat en RabbitMQ:`, error.message);
    } finally {
        await closeChannel(channel).catch(console.error);
    }

    if (!chat) {
        chat = await Chat.findOne({ chatId });
        if (!chat) {
            console.log('Chat no encontrado en MongoDB, creando uno nuevo.');
            chat = new Chat({ chatId, usuarios: [usuario1, usuario2], chats: [] });
            await chat.save();

            try {
                channel = await getRabbitMQChannel();
                await assertQueue(channel, chatId);
                console.log(`Cola ${chatId} creada en RabbitMQ.`);
            } catch (error) {
                console.error(`Error al crear cola en RabbitMQ:`, error.message);
                res.status(500).json({ error: 'Error al crear cola en RabbitMQ' });
                return;
            } finally {
                await closeChannel(channel).catch(console.error);
            }
        } else {
            console.log('Chat encontrado en MongoDB.');
        }
    }

    res.json(chat);
}

async function enviarMensaje(req, res) {
    const { usuario1, usuario2, mensaje } = req.body;

    if (!usuario1 || !usuario2 || !mensaje) {
        res.status(400).json({ error: 'Ambos usuarios y el mensaje deben ser proporcionados' });
        return;
    }

    const chatId = `chat_${Math.min(usuario1, usuario2)}_${Math.max(usuario1, usuario2)}`;
    const fullMessage = JSON.stringify({ sender: usuario1, text: mensaje });

    let channel;
    try {
        channel = await getRabbitMQChannel();
        await assertQueue(channel, chatId);
        await sendMessageToQueue(channel, chatId, fullMessage);
        console.log(`Mensaje enviado a RabbitMQ en la cola '${chatId}': ${fullMessage}`);
    } catch (error) {
        console.error(`Error al enviar mensaje a RabbitMQ en la cola '${chatId}':`, error.message);
        res.status(500).json({ error: 'Error al enviar mensaje a RabbitMQ' });
        return;
    } finally {
        await closeChannel(channel).catch(console.error);
    }

    res.status(200).json({ success: true, message: 'Mensaje enviado' });
}

async function obtenerChats(req, res) {
    const { chatId } = req.params;
    console.log(`Buscando chat con chatId: ${chatId}`);

    let chat;
    try {
        chat = await Chat.findOne({ chatId });
    } catch (error) {
        console.error('Error al buscar el chat en MongoDB:', error.message);
        res.status(500).json({ error: 'Error al buscar el chat en MongoDB' });
        return;
    }

    if (!chat) {
        console.log('Chat no encontrado en MongoDB.');
        res.status(404).json({ error: 'Chat no encontrado' });
        return;
    }

    console.log('Chat encontrado en MongoDB.');
    res.json(chat);
}

module.exports = {
    buscarOcrearChat,
    enviarMensaje,
    obtenerChats
};
