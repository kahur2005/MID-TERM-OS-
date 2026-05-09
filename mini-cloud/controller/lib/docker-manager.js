const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const NETWORK = process.env.NETWORK_NAME || 'mini-cloud-net';

async function startContainer({ id, image, hostPort, containerPort, cpu, memory, env }) {
  const name = `mini-cloud-${id}`;

  const container = await docker.createContainer({
    name,
    Image: image,
    Env: (env || []).map(e => (typeof e === 'object' ? `${e.key}=${e.value}` : e)),
    ExposedPorts: { [`${containerPort}/tcp`]: {} },
    HostConfig: {
      PortBindings: {
        [`${containerPort}/tcp`]: [{ HostPort: String(hostPort) }]
      },
      // CPU: NanoCpus = cores * 1e9
      NanoCpus: cpu ? Math.floor(cpu * 1e9) : null,
      // Memory in bytes
      Memory: memory ? memory * 1024 * 1024 : null,
      RestartPolicy: { Name: 'on-failure', MaximumRetryCount: 3 }
    },
    NetworkingConfig: {
      EndpointsConfig: { [NETWORK]: {} }
    }
  });

  await container.start();

  const info = await container.inspect();
  return {
    containerId: info.Id,
    containerName: name,
    internalIp: info.NetworkSettings.Networks[NETWORK]?.IPAddress || null
  };
}

async function stopContainer(containerId) {
  try {
    const c = docker.getContainer(containerId);
    await c.stop({ t: 10 });
    await c.remove();
  } catch (err) {
    if (err.statusCode !== 404) throw err;
  }
}

async function isRunning(containerId) {
  try {
    const info = await docker.getContainer(containerId).inspect();
    return info.State.Running;
  } catch {
    return false;
  }
}

async function getStats(containerId) {
  try {
    const stats = await docker.getContainer(containerId).stats({ stream: false });

    const cpuDelta    = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage      - stats.precpu_stats.system_cpu_usage;
    const numCpus     = stats.cpu_stats.online_cpus || 1;
    const cpuPct      = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

    const memUsage = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;

    return {
      cpuPercent:   cpuPct.toFixed(2),
      memPercent:   ((memUsage / memLimit) * 100).toFixed(2),
      memUsageMb:   (memUsage / 1024 / 1024).toFixed(2)
    };
  } catch {
    return null;
  }
}

module.exports = { startContainer, stopContainer, isRunning, getStats };
