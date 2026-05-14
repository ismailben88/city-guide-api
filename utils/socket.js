// Singleton — keeps the Socket.IO instance available anywhere in the backend
// without circular imports.
let _io = null;

const setIO = (io) => { _io = io; };
const getIO = ()    => _io;

module.exports = { setIO, getIO };
