// Run mutations against the most recent state, including after a failed write.
function serial() {
  let tail = Promise.resolve();
  const run = task => {
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  };
  run.drain = () => tail;
  return run;
}
module.exports = { serial };
