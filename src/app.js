const express = require('express');
const mongoose = require('mongoose');

// Importar las rutas principales
const routes = require('./routes');

// Crear una instancia de Express
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware para manejar datos de formularios
app.use(express.urlencoded({ extended: true }));

// Configurar las rutas
app.use('/', routes);

// Middleware para manejar errores HTTP 404
app.use((req, res, next) => {
    const error = new Error('Recurso no encontrado');
    error.status = 404;
    next(error);
});

// Middleware para manejar errores
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message,
        },
    });
});

// Puerto donde escucha la aplicación (puerto 5100)
const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Conexión a MongoDB
const mongoURI = 'mongodb://localhost:27017/chatApp';
mongoose.connect(mongoURI, {
    useNewUrlParser: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
    console.log('Conectado a MongoDB.');
});

// Exportar la conexión si es necesario (opcional)
module.exports = db;
