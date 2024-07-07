const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
    usuario: { type: Number, required: true },
    mensaje: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    usuarios: { type: [Number], required: true },
    chats: { type: [mensajeSchema], default: [] },
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
