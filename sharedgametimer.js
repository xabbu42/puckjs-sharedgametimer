var LONG_PRESS_TIME = 1000; // 1 second for long press
var DOUBLE_CLICK_TIME = 300; // 300ms window for double click
var ORIENTATION_THRESHOLD = 10000; // Threshold for Z-axis to determine orientation

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
		['Up',      'remoteActionTogglePause'],
		['Down',    'remoteActionTogglePause'],
		['Shake',   'remoteActionUndo'],
		['Poll',    'remoteActionPoll']
	],
	actionMapName: "Puck.js Actions"
};

function single()  { Bluetooth.println('Single' ) }
function long()    { Bluetooth.println('Long'   ) }
function double()  { Bluetooth.println('Double' ) }
function up()      { Bluetooth.println('Up'     ) }
function down()    { Bluetooth.println('Down'   ) }
function shake()   { Bluetooth.println('Shake'  ) }
function poll()    { Bluetooth.println('Poll'   ) }

// Handle state updates
function handleStateUpdate(stateLine) {
	if (stateLine === "GET SETUP") {
		Bluetooth.println(JSON.stringify(suggestions));
		return;
	} else {
		var parts = stateLine.split(";");
		var state = parts[0];
		var seat = parts[1];
		var seats = parts[2].split(",");
		var actions = parts[3].split(",");

		var index = seats.indexOf(PLAYER_SEAT);
		LED3.write(actions[index] != "");
		LED2.write(state == "pl" && seat == PLAYER_SEAT);
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
	var newOrientation = null;
	if (measure.acc.z > ORIENTATION_THRESHOLD) {
		newOrientation = 'up'; // Right side up
	} else if (measure.acc.z < -ORIENTATION_THRESHOLD) {
		newOrientation = 'down'; // Upside down
	}

	// Only trigger if orientation changed and we have a clear reading
	if (newOrientation && newOrientation !== currentOrientation) {
		currentOrientation = newOrientation;
		if (newOrientation === 'up') {
			up();
			LED1.reset();
		} else if (newOrientation === 'down') {
			down();
			LED1.set();
		}
	}
}

// Check orientation
require("puckjsv2-accel-tilt").on();
Puck.on('accel', checkOrientation);

Bluetooth.on('data', readState);

// Send configuration on Bluetooth connect
NRF.on('connect', function(addr) {
	LoopbackA.setConsole();
	poll();
});

NRF.on('disconnect', function() {
	LED1.reset();
	LED2.reset();
	LED3.reset();
});
