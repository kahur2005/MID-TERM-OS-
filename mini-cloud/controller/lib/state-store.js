const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || '/app/data/instances.json';

class StateStore {
  constructor() {
    this._ensureFile();
  }

  _ensureFile() {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ instances: {} }, null, 2));
    }
  }

  _read() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }

  _write(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  save(instance) {
    const data = this._read();
    data.instances[instance.id] = instance;
    this._write(data);
  }

  remove(id) {
    const data = this._read();
    delete data.instances[id];
    this._write(data);
  }

  get(id) {
    return this._read().instances[id] || null;
  }

  all() {
    return Object.values(this._read().instances);
  }

  updateStatus(id, status) {
    const data = this._read();
    if (data.instances[id]) {
      data.instances[id].status = status;
      data.instances[id].updatedAt = new Date().toISOString();
      this._write(data);
    }
  }

  usedPorts() {
    return this.all().map(i => i.hostPort);
  }
}

module.exports = new StateStore();
