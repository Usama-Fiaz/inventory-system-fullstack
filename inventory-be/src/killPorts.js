const { execSync } = require('child_process');

const ports = [4000, 4001];

function isNodeProcess(pid) {
  try {
    const comm = execSync(`ps -p ${pid} -o comm=`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return comm === 'node';
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    if (!out) return;

    const pids = out
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (pids.length === 0) return;

    const nodePids = pids.filter((pid) => isNodeProcess(pid));
    if (nodePids.length === 0) return;

    execSync(`kill -9 ${nodePids.join(' ')}`, { stdio: 'ignore' });
  } catch {
    return;
  }
}

for (const p of ports) killPort(p);
