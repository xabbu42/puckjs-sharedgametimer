var DEVICE_NAME = "Puck.js";
var LONG_PRESS_TIME = 1000; // 1 second for long press
var DOUBLE_CLICK_TIME = 300; // 300ms window for double click

var suggestions = {
	script: [
	    '0 sgtState;sgtColor%0A'
	],
	scriptName: DEVICE_NAME + " Write",
	defaultTriggers: ["includePlayers","includePause","includeAdmin","includeSimultaneousTurns","includeGameStart","includeGameEnd","includeSandTimerStart","includeSandTimerReset","includeSandTimerStop","includeSandTimerOutOfTime","runOnStateChange","runOnPlayerOrderChange","runOnPoll","runOnBluetoothConnect","runOnBluetoothDisconnect"],
	actionMap: [
		['Single',  'remoteActionPrimary'],
		['Double',  'remoteActionToggleAdmin'],
		['Long',    'remoteActionSecondary'],
		['Up',      'remoteActionTogglePause'],
		['Down',    'remoteActionTogglePause'],
		['Shake',   'remoteActionUndo'],
		['Connect', 'remoteActionPoll']
	],
	actionMapName: DEVICE_NAME + " Actions"
};

var active = false;

function single()  { if (active) Bluetooth.println('Single' ) }
function long()    { if (active) Bluetooth.println('Long'   ) }
function double()  { Bluetooth.println('Double' ) }
function up()      { Bluetooth.println('Up'     ) }
function down()    { Bluetooth.println('Down'   ) }
function shake()   { Bluetooth.println('Shake'  ) }
function connect() { Bluetooth.println('Connect') }

// Timer state variables
var sgtState = 'nc'; // not connected
var sgtColor = null;
var sgtTurnTime = 0;
var sgtPlayerTime = 0;
var incompleteLineRead = '';
var lastReadLine = '';

// Handle timer state updates
function handleStateUpdate(stateLine) {
	if (stateLine === "GET SETUP") {
		Bluetooth.println(JSON.stringify(suggestions));
		return;
	} else {
		active = stateLine.endsWith(";486bfa");
		LED2.write(active && stateLine.startsWith("pl;"));
	}
}

// Read from UART and process timer state
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
}

// Button press detection variables
var pressTimer;
var longPressTimer;
var pressCount = 0;
var isPressed = false;
var pressStartTime = 0;

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

Bluetooth.on('data', readState);

// Send configuration on Bluetooth connect
NRF.on('connect', function(addr) {
	// TODO find a better way to access console
	if (addr == "2c:ca:16:42:3d:62 public") {
		Bluetooth.setConsole();
	} else {
		LoopbackA.setConsole();
		Bluetooth.println(JSON.stringify(suggestions));
		connect();
	}
});

// Transmit Bluetooth Low Energy advertising packets
NRF.setAdvertising({}, {
	showName: false,
	manufacturer: 0x0590,
	manufacturerData: JSON.stringify({ name: "Puck Player 1" })
});
