var PLAYER_SEAT = ""; // Set to number as a string to couple with that PLAYER_SEAT
var LONG_PRESS_TIME = 1000; // 1 second for long press
var DOUBLE_CLICK_TIME = 300; // 300ms window for double click
var ORIENTATION_THRESHOLD = 10000; // Threshold for Z-axis to determine orientation
var SHAKE_THRESHOLD = 50000; // Threshold for detecting shake motion
var SHAKE_COOLDOWN = 1000; // Minimum time between shake detections (ms)
var SHAKE_COUNT = 3; // Number of direction changes needed for shake
var SHAKE_TIME = 500; // Time window to count direction changes (ms)

var suggestions = {
	script: [
	    '0 sgtState;sgtSeat;sgtPlayerSeats;sgtPlayerActions%0A'
	],
	scriptName: "Puck.js Write",
	defaultTriggers: ["includePlayers","includePause","includeAdmin","includeSimultaneousTurns","includeGameStart","includeGameEnd","includeSandTimerStart","includeSandTimerReset","includeSandTimerStop","includeSandTimerOutOfTime","runOnStateChange","runOnPlayerOrderChange","runOnPoll","runOnBluetoothConnect","runOnBluetoothDisconnect"],
	actionMap: [
		['Single',  'remoteActionPrimary'],
		['Double',  'remoteActionToggleAdmin'],
		['Long',    'remoteActionSecondary'],
		['Up',      'remoteActionUnPause'],
		['Down',    'remoteActionPause'],
		['Shake',   'remoteActionUndo'],
		['Poll',    'remoteActionPoll']
	],
	actionMapName: "Puck.js Actions"
};

logs = [];
function log(line) {
	var time = (new Date()).toISOString();
	logs.push({time,line});
	if (logs.length > 20)
		logs.shift();
}

function send(e) {
	var send = e + (PLAYER_SEAT ? ' #' + PLAYER_SEAT : '');
	log(send);
	Bluetooth.println(send);
}

function single()  { send('Single' ) }
function long()    { send('Long'   ) }
function double()  { send('Double' ) }
function up()      { send('Up'     ) }
function down()    { send('Down'   ) }
function shake()   { send('Shake'  ) }
function poll()    { send('Poll'   ) }

// Handle state updates
function handleStateUpdate(stateLine) {
	log(stateLine);
	if (stateLine === "GET SETUP") {
		Bluetooth.println(JSON.stringify(suggestions));
		return;
	} else {
		var parts = stateLine.split(";");
		var state = parts[0];
		var seat = parts[1];
		var seats = parts[2].split(",");
		var actions = parts[3].split(",");

		if (PLAYER_SEAT) {
			var index = seats.indexOf(PLAYER_SEAT);
			LED3.write(index >= 0 && actions[index] != "");
			LED2.write(state == "pl" && seat == PLAYER_SEAT);
		}
	}
}

// Read from UART and process state
var incompleteLineRead = '';
function readState(data) {
	var lines = (incompleteLineRead + data).split("\n");
	if (lines.length === 0) return;
	var lastItem = lines.pop();
	if (lastItem === '') {
		if (lines.length > 0) {
			incompleteLineRead = '';
			handleStateUpdate(lines.pop());
		}
	} else {
		incompleteLineRead = lastItem;
	}
	if (incompleteLineRead == "\u0003") {
		Bluetooth.setConsole();
	}
}

// Button press detection variables
var pressTimer;
var longPressTimer;
var pressCount = 0;
var isPressed = false;
var pressStartTime = 0;

// Orientation detection variables
var currentOrientation = null; // null, 'up', or 'down'

// Shake detection variables
var lastAccel = {x: 0, y: 0, z: 0};
var lastShakeTime = 0;
var directionChanges = 0;
var lastDirection = {x: 0, y: 0, z: 0};
var directionChangeStartTime = 0;

// Orientation change delay variables
var pendingOrientation = null;
var orientationChangeTime = 0;

// Button pressed down
setWatch(function() {
	isPressed = true;
	pressStartTime = getTime() * 1000; // Convert to milliseconds

	// Start long press timer
	longPressTimer = setTimeout(function() {
		if (isPressed) {
			// Long press detected
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			}
			long();
			pressCount = 0;
			isPressed = false;
		}
	}, LONG_PRESS_TIME);

}, BTN, {edge:"rising", debounce:25, repeat:true});

// Button released
setWatch(function() {
	if (!isPressed) return; // Ignore if we weren't tracking a press

	var pressDuration = (getTime() * 1000) - pressStartTime;
	isPressed = false;

	// Clear long press timer since button was released
	if (longPressTimer) {
		clearTimeout(longPressTimer);
		longPressTimer = null;
	}

	// Only count as a press if it wasn't a long press
	if (pressDuration < LONG_PRESS_TIME) {
		pressCount++;

		// Clear any existing timer
		if (pressTimer) {
			clearTimeout(pressTimer);
		}

		// Set timer to handle single/double press
		pressTimer = setTimeout(function() {
			if (pressCount === 1) {
				single();
			} else if (pressCount >= 2) {
				double();
			}
			pressCount = 0;
			pressTimer = null;
		}, DOUBLE_CLICK_TIME);
	}

}, BTN, {edge:"falling", debounce:25, repeat:true});

// Orientation detection using accelerometer
function checkOrientation(measure) {
	var acc = measure.acc;
	var currentTime = getTime() * 1000; // Convert to milliseconds

	// Check for shake detection based on direction changes
	var deltaX = acc.x - lastAccel.x;
	var deltaY = acc.y - lastAccel.y;
	var deltaZ = acc.z - lastAccel.z;
	var totalDelta = Math.abs(deltaX) + Math.abs(deltaY) + Math.abs(deltaZ);

	// Only process if there's significant movement
	if (totalDelta > SHAKE_THRESHOLD) {
		// Determine current direction
		var currentDirection = {
			x: deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0),
			y: deltaY > 0 ? 1 : (deltaY < 0 ? -1 : 0),
			z: deltaZ > 0 ? 1 : (deltaZ < 0 ? -1 : 0)
		};

		// Check if direction changed in any axis
		var directionChanged =
			(currentDirection.x !== lastDirection.x && currentDirection.x !== 0) ||
			(currentDirection.y !== lastDirection.y && currentDirection.y !== 0) ||
			(currentDirection.z !== lastDirection.z && currentDirection.z !== 0);

		if (directionChanged) {
			// Start new direction change window if needed
			if (directionChanges === 0) {
				directionChangeStartTime = currentTime;
			}

			directionChanges++;
			lastDirection = currentDirection;

			// Check if we have enough direction changes within the time window
			if (directionChanges >= SHAKE_COUNT && (currentTime - directionChangeStartTime) <= SHAKE_TIME && (currentTime - lastShakeTime) > SHAKE_COOLDOWN) {
				shake();
				lastShakeTime = currentTime;
				directionChanges = 0; // Reset counter
				digitalPulse(LED1, 1, 1000);
			}
		}

		// Reset direction change counter if window expired
		if ((currentTime - directionChangeStartTime) > SHAKE_TIME) {
			directionChanges = 0;
		}
	}

	// Store current acceleration for next comparison
	lastAccel = {x: acc.x, y: acc.y, z: acc.z};

	// Check orientation
	var newOrientation = null;
	if (acc.z > ORIENTATION_THRESHOLD) {
		newOrientation = 'up'; // Right side up
	} else if (acc.z < -ORIENTATION_THRESHOLD) {
		newOrientation = 'down'; // Upside down
	}

	// Handle orientation changes with delay to avoid triggering during shakes
	if (newOrientation && newOrientation !== currentOrientation) {
		// If this is a new orientation change, start the delay timer
		if (pendingOrientation !== newOrientation) {
			pendingOrientation = newOrientation;
			orientationChangeTime = currentTime;
		}
		// If orientation has been stable for the delay period and no recent shake
		else if ((currentTime - orientationChangeTime) >= SHAKE_TIME && 
		         (currentTime - lastShakeTime) > SHAKE_COOLDOWN) {
			currentOrientation = newOrientation;
			pendingOrientation = null;
			if (newOrientation === 'up') {
				up();
			} else if (newOrientation === 'down') {
				down();
			}
		}
	}
	// Reset pending orientation if we're back to neutral or different orientation
	else if (pendingOrientation && (!newOrientation || newOrientation !== pendingOrientation)) {
		pendingOrientation = null;
	}
}

// Check orientation
Puck.on('accel', checkOrientation);

Bluetooth.on('data', readState);

// Send configuration on Bluetooth connect
NRF.on('connect', function(addr) {
	require("puckjsv2-accel-movement").on()
	LoopbackA.setConsole();
	poll();
});

NRF.on('disconnect', function() {
	require("puckjsv2-accel-movement").off()
	LED1.reset();
	LED2.reset();
	LED3.reset();
});

save();
