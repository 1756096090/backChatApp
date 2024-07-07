const express = require('express');
const router = express.Router();
const {   enviarYActualizarMensajes ,consultarMensajes } = require('./controllers/messageController');


router.post('/send-message', enviarYActualizarMensajes);

router.get('/consultar-mensajes', consultarMensajes);

const RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'prueba';

const { connect: connectRabbitMQ } = require('amqplib');


router.get('/consultar-mensajes', consultarMensajes);

router.get('/test-rabbitmq', async (req, res) => {
    try {
        // Intentar conectar con RabbitMQ
        const connection = await connectRabbitMQ(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // Asegurarse de que exista la cola
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Enviar un mensaje de prueba a la cola
        const message = 'Hola desde RabbitMQ!';
        await channel.sendToQueue(QUEUE_NAME, Buffer.from(message));

        console.log(`Mensaje enviado a RabbitMQ en la cola '${QUEUE_NAME}':`, message);

        // Cerrar la conexión
        await connection.close();

        res.status(200).json({ message: 'Conexión exitosa con RabbitMQ y mensaje enviado.' });
    } catch (error) {
        console.error('Error al conectar con RabbitMQ o enviar mensaje:', error.message);
        res.status(500).json({ error: 'Error al conectar con RabbitMQ o enviar mensaje.', errorMessage: error.message });
    }
});


module.exports = router;
