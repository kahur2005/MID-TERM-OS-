const express = require('express');
const { v4: uuidv4 } = require('uuid');

const dockerMgr   = require('../lib/docker-manager');
const portAlloc   = require('../lib/port-allocator');
const proxyMgr    = require('../lib/proxy-manager');
const store       = require('../lib/state-store');

const router = express.Router();

const DEFAULT_IMAGE         = process.env.SERVICE_IMAGE   || 'mini-cloud-hello';
const DEFAULT_CONTAINER_PORT = 8080;

// GET /api/instances
router.get('/', (req, res) => {
  const instances = store.all();
  res.json({ count: instances.length, instances });
});

// GET /api/instances/:id
router.get('/:id', (req, res) => {
  const inst = store.get(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });
  res.json(inst);
});

// POST /api/instances  — create & start a new instance
router.post('/', async (req, res) => {
  const {
    name,
    image         = DEFAULT_IMAGE,
    containerPort = DEFAULT_CONTAINER_PORT,
    cpu           = 0.5,    // cores
    memory        = 128,    // MB
    env           = []
  } = req.body;

  let hostPort;
  try {
    hostPort = portAlloc.allocate();
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }

  const id = uuidv4().replace(/-/g, '').slice(0, 8);
  const instance = {
    id,
    name:          name || `service-${id}`,
    image,
    hostPort,
    containerPort,
    cpu,
    memory,
    env,
    status:        'starting',
    containerId:   null,
    containerName: null,
    internalIp:    null,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString()
  };

  store.save(instance);

  try {
    const result = await dockerMgr.startContainer({ id, image, hostPort, containerPort, cpu, memory, env });

    instance.containerId   = result.containerId;
    instance.containerName = result.containerName;
    instance.internalIp    = result.internalIp;
    instance.status        = 'running';
    instance.updatedAt     = new Date().toISOString();
    store.save(instance);

    proxyMgr.register(id, `http://${result.containerName}:${containerPort}`);

    res.status(201).json({
      message:  'Instance started',
      instance,
      proxyUrl: `/proxy/${id}/`
    });
  } catch (err) {
    instance.status = 'failed';
    instance.error  = err.message;
    store.save(instance);
    res.status(500).json({ error: 'Failed to start container', message: err.message });
  }
});

// DELETE /api/instances/:id  — stop & remove
router.delete('/:id', async (req, res) => {
  const inst = store.get(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });

  try {
    if (inst.containerId) await dockerMgr.stopContainer(inst.containerId);
    proxyMgr.unregister(inst.id);
    store.remove(inst.id);
    res.json({ message: `Instance ${inst.id} stopped and removed` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to stop instance', message: err.message });
  }
});

// POST /api/instances/:id/restart
router.post('/:id/restart', async (req, res) => {
  const inst = store.get(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });

  try {
    if (inst.containerId) await dockerMgr.stopContainer(inst.containerId);
    proxyMgr.unregister(inst.id);

    const result = await dockerMgr.startContainer({
      id:            inst.id,
      image:         inst.image,
      hostPort:      inst.hostPort,
      containerPort: inst.containerPort,
      cpu:           inst.cpu,
      memory:        inst.memory,
      env:           inst.env
    });

    inst.containerId   = result.containerId;
    inst.containerName = result.containerName;
    inst.internalIp    = result.internalIp;
    inst.status        = 'running';
    inst.updatedAt     = new Date().toISOString();
    store.save(inst);

    proxyMgr.register(inst.id, `http://${result.containerName}:${inst.containerPort}`);

    res.json({ message: 'Instance restarted', instance: inst });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restart instance', message: err.message });
  }
});

module.exports = router;
