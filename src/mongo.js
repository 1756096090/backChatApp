// consultarChats.js

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function consultarChats() {
    try {
        const client = await MongoClient.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const db = client.db(); // Obtener la instancia de la base de datos
        const collection = db.collection('chats'); // Obtener la colección 'chats'

        // Realizar la consulta
        const chats = await collection.find({}).toArray();

        console.log('Chats encontrados:');
        console.log(chats);

        await client.close();
        console.log('Conexión cerrada con MongoDB.');
    } catch (error) {
        console.error('Error al consultar chats:', error);
    }
}

consultarChats();
