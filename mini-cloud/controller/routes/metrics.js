const express = require('express');
const os      = require('os');

const dockerMgr = require('../lib/docker-manager');
const store     = require('../lib/state-store');

const router = express.Router();

// GET /api/metrics  — host-level + instance summary
router.get('/', async (req, res) => {
  const cpus      = os.cpus();
  const freeMem   = os.freemem();
  const totalMem  = os.totalmem();
  const instances = store.all();

  res.json({
    host: {
      cpuCores:    cpus.length,
      cpuModel:    cpus[0]?.model || 'unknown',
      memFreeMb:   Math.round(freeMem  / 1024 / 1024),
      memTotalMb:  Math.round(totalMem / 1024 / 1024),
      memUsedPct:  (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
      uptime:      os.uptime()
    },
    instances: {
      total:   instances.length,
      running: instances.filter(i => i.status === 'running').length,
      failed:  instances.filter(i => i.status === 'failed').length,
      stopped: instances.filter(i => i.status === 'stopped').length
    },
    portRange: {
      start: parseInt(process.env.PORT_RANGE_START) || 4000,
      end:   parseInt(process.env.PORT_RANGE_END)   || 4999,
      used:  instances.map(i => i.hostPort)
    }
  });
});

// GET /api/metrics/:id  — per-container Docker stats
router.get('/:id', async (req, res) => {
  const inst = store.get(req.params.id);
  if (!inst)              return res.status(404).json({ error: 'Instance not found' });
  if (!inst.containerId)  return res.status(400).json({ error: 'No container assigned' });

  const stats = await dockerMgr.getStats(inst.containerId);
  if (!stats) return res.status(503).json({ error: 'Container unavailable or not running' });

  res.json({
    instanceId:    inst.id,
    name:          inst.name,
    cpuAlloc:      inst.cpu,
    memAllocMb:    inst.memory,
    ...stats
  });
});

module.exports = router;
