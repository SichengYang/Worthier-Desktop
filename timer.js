const minutes = parseInt(process.argv[2], 10) || 60;

console.log(`Timer started for ${minutes} minute(s)...`);

const timeout = setTimeout(() => {
  process.send({ type: 'break-time' });
}, minutes * 60 * 1000);

// Listen for cancel command from main process
process.on('message', (msg) => {
  if (msg === 'cancel') {
    clearTimeout(timeout);
    console.log('Timer canceled.');
    process.exit(0); // clean exit
  }
});