// Example usage showing how both main.js and timer.js can share the same TimeRecorder instance

// In main.js:
const timeRecorder = require('./recordTime');

// No need for 'new' - just use it directly
console.log('Current working time:', timeRecorder.getTodaysTime());
timeRecorder.recordSession(30, 'focus');

// In timer.js:
const timeRecorder = require('./recordTime');

// Same instance, no need for 'new'
timeRecorder.addMinutes(1);
console.log('Updated time:', timeRecorder.getTodaysTime());

// Both files share the same data automatically!
