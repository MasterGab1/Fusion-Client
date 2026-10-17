const { StringDecoder } = require('node:string_decoder');
// Each process stream has its own decoder: XML events and UTF-8 can span chunks.
function gameOutput(log, secret = '') {
  const decoder = new StringDecoder('utf8'); let buffer = '';
  const redact = text => secret ? text.replaceAll(secret, '[redacted]') : text;
  const emit = (message, level = 'game') => {
    message = redact(message).replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (message) log(message.slice(0, 16000), level);
  };
  function plain(line) {
    if (/^\s*<\/?(?:log4j:|Event|Events|Logger|Instant|Thread)/.test(line) || /^\s*<\?xml/.test(line)) return;
    const match = /\b(WARN|ERROR|FATAL|DEBUG|TRACE|INFO)\b/i.exec(line);
    emit(line, match ? ({ fatal: 'error', trace: 'debug' }[match[1].toLowerCase()] || match[1].toLowerCase()) : 'game');
  }
  function drain(final = false) {
    for (;;) {
      const start = buffer.search(/<(?:log4j:)?Event\b/);
      if (start > 0) { buffer.slice(0, start).split(/\r?\n/).forEach(plain); buffer = buffer.slice(start); continue; }
      if (start === 0) {
        const end = /<\/(?:log4j:)?Event>/.exec(buffer);
        if (!end) { if (buffer.length > 128 * 1024 || final) { emit('An incomplete game log entry was skipped.', 'warn'); buffer = ''; } return; }
        const event = buffer.slice(0, end.index + end[0].length); buffer = buffer.slice(event.length);
        const level = (/\blevel="([A-Z]+)"/.exec(event)?.[1] || 'INFO').toLowerCase();
        const decode = content => content.startsWith('<![CDATA[') ? content.slice(9, -3) : content.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
        const content = /<(?:log4j:)?Message>([\s\S]*?)<\/(?:log4j:)?Message>/.exec(event)?.[1] || '';
        const thrown = /<(?:log4j:)?Throwable>([\s\S]*?)<\/(?:log4j:)?Throwable>/.exec(event)?.[1];
        const message = decode(content) + (thrown ? '\n' + decode(thrown) : '');
        emit(message, ({ fatal: 'error', trace: 'debug' }[level] || level));
        continue;
      }
      const newline = buffer.indexOf('\n');
      if (newline >= 0) { plain(buffer.slice(0,newline)); buffer=buffer.slice(newline+1); continue; }
      if (final || buffer.length > 128 * 1024) { plain(buffer); buffer = ''; }
      return;
    }
  }
  return { write(data) { buffer += decoder.write(Buffer.isBuffer(data) ? data : Buffer.from(data)); drain(); }, end() { buffer += decoder.end(); drain(true); } };
}
module.exports = { gameOutput };
