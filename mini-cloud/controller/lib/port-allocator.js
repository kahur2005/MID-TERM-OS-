const store = require('./state-store');

const START = parseInt(process.env.PORT_RANGE_START) || 4000;
const END   = parseInt(process.env.PORT_RANGE_END)   || 4999;

function allocate() {
  const used = new Set(store.usedPorts());
  for (let port = START; port <= END; port++) {
    if (!used.has(port)) return port;
  }
  throw new Error(`No available ports in range ${START}-${END}`);
}

module.exports = { allocate };
