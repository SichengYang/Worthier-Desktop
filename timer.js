const getTimeRecorder = require('./recordTime');

const minutes = parseInt(process.argv[2], 10) || 60;
const userDataPath = process.argv[3]; // Get userData path from main process
let isRunning = true; // Flag to track if timer is still running
let minutesRecorded = 0; // Track how many minutes we've recorded

let timeRecorder = getTimeRecorder(userDataPath);

console.log(`Timer started for ${minutes} minute(s)... (PID: ${process.pid})`);
console.log(`Using userData path: ${userDataPath}`);

const timeout = setTimeout(() => {
  process.send({ type: 'break-time' });
}, minutes * 60 * 1000);

const recordEveryMinute = setInterval(() => {
  if (isRunning) {
    minutesRecorded++;
    timeRecorder.addMinutes(1);
    console.log(`Recorded minute ${minutesRecorded}/${minutes}. Total today: ${timeRecorder.getTodaysTime()} minutes`);
  }
}, 60 * 1000);

// Listen for cancel command from main process
process.on('message', (msg) => {
  if (msg === 'cancel') {
    console.log(`Received cancel command... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
    isRunning = false;
    timeRecorder.addMinutes(1);
    clearTimeout(timeout);
    clearInterval(recordEveryMinute);
    
    console.log('Timer canceled.');
    process.exit(0); // clean exit
  }
  else if (msg === 'no-response') {
    console.log(`No response detected, assuming user went to rest... (PID: ${process.pid}, recorded ${minutesRecorded} minutes)`);
    isRunning = false;
    clearTimeout(timeout);
    clearInterval(recordEveryMinute);

    console.log('Timer auto-canceled due to no response.');
    process.exit(0); // clean exit
  }
});