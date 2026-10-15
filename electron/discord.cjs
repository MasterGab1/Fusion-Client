const net = require('node:net');
const { randomUUID } = require('node:crypto');
const MAX_FRAME = 1024 * 1024;
function frame(opcode, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(JSON.stringify(payload));
  const header = Buffer.alloc(8); header.writeUInt32LE(opcode, 0); header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
function activityFor(version, startedAt) {
  return { details: version ? `Minecraft ${version}` : 'In the launcher', state: version ? 'Playing with Fusion' : 'Browsing Fusion', timestamps: { start: startedAt }, instance: false };
}
class DiscordPresence {
  constructor({ clientId, emit = () => {}, connect = address => net.createConnection(address), retryMs = 30000, throttleMs = 15000 }) {
    Object.assign(this, { clientId, emit, connect, retryMs, throttleMs });
    this.enabled = false; this.generation = 0; this.status = 'disabled'; this.socket = null; this.ready = false;
    this.startedAt = Math.floor(Date.now() / 1000); this.version = null; this.lastSent = 0;
  }
  snapshot() { return { enabled: this.enabled, status: this.status }; }
  report(status) { this.status = status; this.emit(this.snapshot()); }
  setEnabled(enabled) {
    if (enabled === this.enabled) return;
    if (!enabled) return this.stop();
    this.enabled = true;
    if (!/^\d{17,20}$/.test(this.clientId || '')) { this.report('unavailable'); return; }
    this.report('connecting'); this.open(0, ++this.generation);
  }
  setGame(version = null) {
    if (version !== null && !/^\d+\.\d+(?:\.\d+)?$/.test(version)) return;
    if (this.version === version) return;
    this.version = version; this.startedAt = Math.floor(Date.now() / 1000); this.flush();
  }
  retry(generation) {
    if (!this.enabled || generation !== this.generation) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.open(0, generation), this.retryMs); this.retryTimer.unref?.();
  }
  open(index, generation) {
    if (!this.enabled || generation !== this.generation) return;
    if (index >= 10) { this.report('disconnected'); this.retry(generation); return; }
    let socket;
    try { socket = this.connect(`\\\\?\\pipe\\discord-ipc-${index}`); }
    catch { this.open(index + 1, generation); return; }
    this.socket = socket; this.ready = false;
    let buffer = Buffer.alloc(0), finished = false, wasReady = false;
    const timeout = setTimeout(() => fail(), 2000); timeout.unref?.();
    const active = () => this.enabled && generation === this.generation && socket === this.socket && !finished;
    const fail = () => {
      if (finished) return; finished = true; clearTimeout(timeout); socket.destroy();
      if (generation !== this.generation || !this.enabled) return;
      this.ready = false; clearTimeout(this.flushTimer); this.pendingNonce = null;
      if (wasReady) { this.report('disconnected'); this.retry(generation); }
      else this.open(index + 1, generation);
    };
    socket.on('connect', () => { if (active()) socket.write(frame(0, { v: 1, client_id: this.clientId })); });
    socket.on('error', fail); socket.on('close', fail);
    socket.on('data', chunk => {
      if (!active()) return;
      if (buffer.length + chunk.length > MAX_FRAME + 8) return fail();
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const opcode = buffer.readUInt32LE(0), length = buffer.readUInt32LE(4);
        if (length > MAX_FRAME) return fail();
        if (buffer.length < length + 8) return;
        const body = buffer.subarray(8, length + 8); buffer = buffer.subarray(length + 8);
        if (opcode === 3) { socket.write(frame(4, body)); continue; }
        if (opcode === 2) return fail();
        if (opcode !== 1) continue;
        let message; try { message = JSON.parse(body.toString('utf8')); } catch { return fail(); }
        if (message.evt === 'ERROR') return fail();
        if (message.evt === 'READY' && !wasReady) {
          clearTimeout(timeout); wasReady = true; this.ready = true; this.lastSent = 0; this.flush();
        } else if (message.cmd === 'SET_ACTIVITY' && message.nonce === this.pendingNonce) {
          this.pendingNonce = null; this.report('connected');
        }
      }
    });
  }
  flush() {
    if (!this.enabled || !this.ready || !this.socket || this.socket.destroyed) return;
    clearTimeout(this.flushTimer);
    const wait = this.throttleMs - (Date.now() - this.lastSent);
    if (wait > 0) { this.flushTimer = setTimeout(() => this.flush(), wait); this.flushTimer.unref?.(); return; }
    this.lastSent = Date.now(); this.pendingNonce = randomUUID();
    this.socket.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: activityFor(this.version, this.startedAt) }, nonce: this.pendingNonce }));
  }
  stop() {
    this.enabled = false; this.generation++; clearTimeout(this.retryTimer); clearTimeout(this.flushTimer);
    const socket = this.socket; this.socket = null;
    if (socket && !socket.destroyed) {
      if (this.ready) socket.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: randomUUID() }));
      socket.end(); const timer = setTimeout(() => socket.destroy(), 500); timer.unref?.();
    }
    this.ready = false; this.pendingNonce = null; this.report('disabled');
  }
}
module.exports = { DiscordPresence, activityFor, frame, MAX_FRAME };
