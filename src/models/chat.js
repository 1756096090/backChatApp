const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
    usuarioID1: { type: Number },
    usuarioID2: { type: Number },
    mensaje: { type: String },
    fecha: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    chatId: { type: String, unique: true },
    usuarios: { type: [Number] },
    chats: { type: [mensajeSchema], default: [] },
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);
