const docker  = require('./docker-manager');
const store   = require('./state-store');
const proxy   = require('./proxy-manager');

const INTERVAL = parseInt(process.env.HEALTH_INTERVAL) || 30000;
let timer = null;

async function checkAll() {
  const instances = store.all().filter(i => i.status !== 'stopped');

  for (const inst of instances) {
    if (!inst.containerId) continue;

    try {
      const running = await docker.isRunning(inst.containerId);

      if (!running && inst.status === 'running') {
        console.log(`[Health] ${inst.id} (${inst.name}) went down — marking failed`);
        store.updateStatus(inst.id, 'failed');
        proxy.unregister(inst.id);
      } else if (running && inst.status === 'failed') {
        console.log(`[Health] ${inst.id} (${inst.name}) recovered`);
        store.updateStatus(inst.id, 'running');
        proxy.register(inst.id, `http://${inst.containerName}:${inst.containerPort}`);
      }
    } catch (err) {
      console.error(`[Health] Error checking ${inst.id}:`, err.message);
    }
  }
}

module.exports = {
  start() {
    console.log(`[Health] Monitor started (interval: ${INTERVAL}ms)`);
    checkAll();
    timer = setInterval(checkAll, INTERVAL);
  },
  stop() {
    if (timer) clearInterval(timer);
  }
};
