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
    console.log("🚀 ~ buscarOcrearChat ~ usuario1:", usuario1)

    const chats = await Chat.find({ usuarios: usuario1 }, 'usuarios');
    console.log("🚀 ~ buscarOcrearChat ~ chats:", chats)

        const usuariosEncontrados = new Set();

        chats.forEach(chat => {
            chat.usuarios.forEach(id => {
                if (id !== usuario1) {
                    usuariosEncontrados.add(id);
                }
            });
        });

    const chatId = `chat_${usuario1}`;

    let channel;
    try {
        channel = await getRabbitMQChannel();
        await assertQueue(channel, chatId);

        const messages = [];
        let resolveFirstMessagePromise;
        const firstMessagePromise = new Promise((resolve) => {
            resolveFirstMessagePromise = resolve;
        });

        const consumerTag = await channel.consume(chatId, (msg) => {
            if (msg !== null) {
                messages.push(JSON.parse(msg.content.toString()));
                if (messages.length === 1) {
                    resolveFirstMessagePromise();
                }
            }
        }, { noAck: true });
        await firstMessagePromise;
        await new Promise((resolve) => setTimeout(resolve, 500));

        await channel.cancel(consumerTag.consumerTag);

        if (messages.length > 0) {
            console.log('Chats encontrados en RabbitMQ.');
            res.json(messages);
        } else {
            console.log('No se encontraron mensajes en la cola, esto no debería suceder.');
            res.status(500).json({ error: 'Error inesperado, no se encontraron mensajes en la cola.' });
        }
    } catch (error) {
        console.error(`Error al buscar chat en RabbitMQ:`, error.message);
        res.status(500).json({ error: 'Error al buscar chat en RabbitMQ' });
    } finally {
        await closeChannel(channel).catch(console.error);
    }
}

async function obtenerMensajesDeBase(req, res) {
    const { usuario1, usuario2 } = req.body;
    
    console.log("🚀 ~ obtenerMensajesDeBase ~ req.body:", req.body)

    if (!usuario1 || !usuario2) {
        res.status(400).json({ error: 'Ambos usuarios deben ser proporcionados' });
        return;
    }

    const chatId = `chat_${Math.min(usuario1, usuario2)}_${Math.max(usuario1, usuario2)}`;
    let chat;

    try {
        chat = await Chat.findOne({ chatId });
        if (chat) {
            console.log('Chat encontrado en MongoDB.');
            res.json(chat.chats);
        } else {
            console.log('Chat no encontrado en MongoDB.');
            res.status(404).json({ error: 'Chat no encontrado en MongoDB' });
        }
    } catch (mongoError) {
        console.error(`Error al buscar chat en MongoDB:`, mongoError.message);
        res.status(500).json({ error: 'Error al buscar chat en MongoDB' });
    }
}



async function enviarMensaje(req, res) {
    const { usuario1, usuario2, mensaje } = req.body;

    if (!usuario1 || !usuario2 || !mensaje) {
        res.status(400).json({ error: 'Ambos usuarios y el mensaje deben ser proporcionados' });
        return;
    }


    const fullMessage = {
        usuario1: usuario1,
        usuario2: usuario2,
        mensaje: mensaje,
        fecha: new Date()
    };

    try {
        // Encuentra o crea un nuevo chat basado en los usuarios
        let chatB = await Chat.findOne({ usuarios: { $all: [usuario1, usuario2] } });
        if (!chatB) {
            chatB = new Chat({
                chatId: `chat_${Math.min(usuario1, usuario2)}_${Math.max(usuario1, usuario2)}`,
                usuarios: [usuario1, usuario2]
            });
        }

        // Agrega el nuevo mensaje al chat
        chatB.chats.push(fullMessage);

        // Guarda el chat actualizado en la base de datos
        await chatB.save();
        console.log(`Mensaje guardado en la base de datos: ${JSON.stringify(fullMessage)}`);

        let channel;
        let chatIDRabbid = `chat_${usuario2}`
        try {
            channel = await getRabbitMQChannel();
            await assertQueue(channel, chatB.chatId);
            await sendMessageToQueue(channel, chatIDRabbid, JSON.stringify(fullMessage));
            console.log(`Mensaje enviado a RabbitMQ en la cola '${chatB.chatId}': ${JSON.stringify(fullMessage)}`);
        } catch (error) {
            console.error(`Error al enviar mensaje a RabbitMQ en la cola '${chatB.chatId}':`, error.message);
            res.status(500).json({ error: 'Error al enviar mensaje a RabbitMQ' });
            return;
        } finally {
            await closeChannel(channel).catch(console.error);
        }

        res.status(200).json({ success: true, message: 'Mensaje enviado' });
    } catch (error) {
        console.error(`Error al guardar el mensaje en la base de datos:`, error.message);
        res.status(500).json({ error: 'Error al guardar el mensaje en la base de datos' });
    }
}

module.exports = {
    enviarMensaje,
    // Otros controladores aquí
};




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
    obtenerChats,
    obtenerMensajesDeBase
};
