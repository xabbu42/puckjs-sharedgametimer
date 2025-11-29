var DEVICE_NAME = "Puck.js";
var LONG_PRESS_TIME = 1000; // 1 second for long press
var DOUBLE_CLICK_TIME = 300; // 300ms window for double click

var suggestions = {
	// script: [
	//     '0 sgtState;sgtColor;sgtTurnTime;sgtPlayerTime%0A'
	// ],
	// scriptName: "Pill Button Write",
	// defaultTriggers: ["includePlayers","includePause","includeAdmin","includeSimultaneousTurns","includeGameStart","includeGameEnd","includeSandTimerStart","includeSandTimerReset","includeSandTimerStop","includeSandTimerOutOfTime","runOnStateChange","runOnPlayerOrderChange","runOnPoll","runOnBluetoothConnect","runOnBluetoothDisconnect"],
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

function single()  { print('Single' ) }
function double()  { print('Double' ) }
function long()    { print('Long'   ) }
function up()      { print('Up'     ) }
function down()    { print('Down'   ) }
function shake()   { print('Shake'  ) }
function connect() { print('Connect') }

echo(false);

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

}, BTN, {edge:"falling", debounce:50, repeat:true});

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

}, BTN, {edge:"rising", debounce:50, repeat:true});

// Send configuration on Bluetooth connect
NRF.on('connect', function(addr) {
	print(JSON.stringify(suggestions));
});

// Transmit Bluetooth Low Energy advertising packets
NRF.setAdvertising({}, {
	showName: false,
	manufacturer: 0x0590,
	manufacturerData: JSON.stringify({ name: "Puck Player 1" })
});
