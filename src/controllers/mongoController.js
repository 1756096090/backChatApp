const { MongoClient } = require('mongodb');

const MONGODB_URL = 'mongodb://localhost:27017';
const DATABASE_NAME = 'chatApp';

let client;

async function connectMongoClient() {
    try {
        client = await MongoClient.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Conectado a MongoDB.');
    } catch (error) {
        console.error('Error al conectar con MongoDB:', error.message);
        throw error;
    }
}

async function closeMongoClient() {
    try {
        if (client) {
            await client.close();
            console.log('Conexión con MongoDB cerrada correctamente.');
        }
    } catch (error) {
        console.error('Error al cerrar la conexión con MongoDB:', error.message);
        throw error;
    }
}

async function consultarMensajes(usuarioId1, usuarioId2) {
    try {
        const db = client.db(DATABASE_NAME);
        const chatsCollection = db.collection('chats');
        
        const mensajes = await chatsCollection.find({
            usuarios: { $all: [usuarioId1, usuarioId2] }
        }).toArray();

        console.log('Mensajes consultados desde MongoDB:', mensajes);
        return mensajes;
    } catch (error) {
        console.error('Error al consultar mensajes desde MongoDB:', error.message);
        throw error;
    }
}

async function guardarMensajeEnMongoDB(mensaje, usuarios) {
    try {
        const db = client.db(DATABASE_NAME);
        const chatsCollection = db.collection('chats');

        const resultado = await chatsCollection.updateOne(
            { usuarios: { $all: usuarios } },
            { $push: { chats: mensaje } },
            { upsert: true }
        );

        console.log('Mensaje guardado en MongoDB:', resultado);
    } catch (error) {
        console.error('Error al guardar mensaje en MongoDB:', error.message);
        throw error;
    }
}

module.exports = {
    connectMongoClient,
    closeMongoClient,
    consultarMensajes,
    guardarMensajeEnMongoDB
};
