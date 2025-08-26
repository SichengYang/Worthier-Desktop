const getTimeRecorder = require('./recordTime');
const uploadWorkLog = require('./uploadWorkingLog');

const minutes = parseInt(process.argv[2], 10) || 60;
const userDataPath = process.argv[3]; // Get userData path from main process
let isRunning = true; // Flag to track if timer is still running
let minutesRecorded = 0; // Track how many minutes we've recorded

let timeRecorder = getTimeRecorder(userDataPath);

console.log(`Timer started for ${minutes} minute(s)... (PID: ${process.pid})`);
console.log(`Using userData path: ${userDataPath}`);

const timeout = setTimeout(async () => {
  process.send({ type: 'break-time' });
  uploadWorkLog();
}, minutes * 60 * 1000);

const recordEveryMinute = setInterval(async () => {
  if (isRunning) {
    minutesRecorded++;
    await timeRecorder.addMinutes(1);
    console.log(`Recorded minute ${minutesRecorded}/${minutes}. Total today: ${timeRecorder.getTodaysTime()} minutes`);
  }
}, 60 * 1000);

// Listen for cancel command from main process
process.on('message', async (msg) => {
  if (msg === 'cancel') {
    console.log(`Received cancel command... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
    isRunning = false;
    timeRecorder.addMinutes(1);
    clearTimeout(timeout);
    clearInterval(recordEveryMinute);
    uploadWorkLog();

    console.log('Timer canceled.');
    process.exit(0); // clean exit
  }
  else if (msg === 'no-response') {
    console.log(`No response detected, assuming user went to rest... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
    isRunning = false;
    clearTimeout(timeout);
    clearInterval(recordEveryMinute);
    uploadWorkLog();

    console.log('Timer auto-canceled due to no response.');
    process.exit(0); // clean exit
  }
});

// Handle parent process disconnect (when main app quits unexpectedly)
process.on('disconnect', () => {
  console.log(`Parent process disconnected, cleaning up timer... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
  isRunning = false;
  clearTimeout(timeout);
  clearInterval(recordEveryMinute);
  
  console.log('Timer process exiting due to parent disconnect.');
  process.exit(0);
});

// Handle process termination signals
process.on('SIGTERM', () => {
  console.log(`Received SIGTERM, cleaning up timer... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
  isRunning = false;
  clearTimeout(timeout);
  clearInterval(recordEveryMinute);
  
  console.log('Timer process exiting due to SIGTERM.');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`Received SIGINT, cleaning up timer... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
  isRunning = false;
  clearTimeout(timeout);
  clearInterval(recordEveryMinute);
  
  console.log('Timer process exiting due to SIGINT.');
  process.exit(0);
});