const crypto = require('crypto');
const os = require('os');

function generateStableDeviceId() {
  // Option 1: Hardware fingerprint
  const cpuModel = os.cpus()[0]?.model || 'unknown';
  const platform = os.platform();
  const arch = os.arch();
  const hostname = os.hostname();
  const totalmem = os.totalmem();
  
  const fingerprint = `${cpuModel}-${platform}-${arch}-${hostname}-${totalmem}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
}

module.exports = generateStableDeviceId;