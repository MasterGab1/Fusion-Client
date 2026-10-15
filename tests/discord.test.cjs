const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { DiscordPresence, frame, MAX_FRAME } = require('../electron/discord.cjs');
function fixture() {
  const sockets = [], events = [];
  const rpc = new DiscordPresence({ clientId: '1543243710588915732', throttleMs: 0, emit: v => events.push(v), connect: () => {
    const socket = new EventEmitter(); socket.writes = []; socket.write = v => socket.writes.push(v);
    socket.destroy = () => { socket.destroyed = true; }; socket.end = socket.destroy;
    sockets.push(socket); return socket;
  } });
  rpc.setEnabled(true); const socket = sockets[0]; socket.emit('connect');
  return { rpc, socket, sockets, events };
}
const read = bytes => JSON.parse(bytes.subarray(8).toString());
test('Discord waits for acknowledgement, handles fragmented frames, updates game and clears activity', () => {
  const { rpc, socket } = fixture();
  try {
    assert.deepEqual(read(socket.writes[0]), { v: 1, client_id: '1543243710588915732' });
    const ready = frame(1, { evt: 'READY' });
    socket.emit('data', ready.subarray(0, 6)); assert.equal(socket.writes.length, 1);
    socket.emit('data', ready.subarray(6)); const activity = read(socket.writes[1]);
    assert.equal(activity.args.activity.details, 'In the launcher');
    assert.equal(rpc.snapshot().status, 'connecting');
    socket.emit('data', frame(1, { cmd: 'SET_ACTIVITY', nonce: activity.nonce }));
    assert.equal(rpc.snapshot().status, 'connected');
    rpc.setGame('1.8.9'); assert.equal(read(socket.writes.at(-1)).args.activity.details, 'Minecraft 1.8.9');
    rpc.setGame(null); assert.equal(read(socket.writes.at(-1)).args.activity.details, 'In the launcher');
    socket.emit('data', frame(3, Buffer.from('ping'))); assert.equal(socket.writes.at(-1).readUInt32LE(0), 4);
    rpc.setEnabled(false); assert.equal(read(socket.writes.at(-1)).args.activity, null);
    assert.equal(rpc.snapshot().status, 'disabled');
  } finally { rpc.stop(); }
});
test('Discord rejects malformed and oversized frames, then ignores stale socket callbacks', () => {
  const { rpc, socket, sockets } = fixture();
  try {
    socket.emit('data', frame(1, Buffer.from('invalid'))); assert.equal(socket.destroyed, true); assert.equal(sockets.length, 2);
    const oversized = Buffer.alloc(8); oversized.writeUInt32LE(MAX_FRAME + 1, 4);
    sockets[1].emit('data', oversized); assert.equal(sockets.length, 3);
    rpc.stop(); socket.emit('data', frame(1, { evt: 'READY' })); assert.equal(rpc.snapshot().status, 'disabled');
  } finally { rpc.stop(); }
});
