var DEVICE_NAME = "Puck.js";
var suggestions = {
    // script: [
    //     '0 sgtState;sgtColor;sgtTurnTime;sgtPlayerTime%0A'
    // ],
    // scriptName: "Pill Button Write",
    // defaultTriggers: ["includePlayers","includePause","includeAdmin","includeSimultaneousTurns","includeGameStart","includeGameEnd","includeSandTimerStart","includeSandTimerReset","includeSandTimerStop","includeSandTimerOutOfTime","runOnStateChange","runOnPlayerOrderChange","runOnPoll","runOnBluetoothConnect","runOnBluetoothDisconnect"],
    actionMap: [
        ['Single', 'remoteActionPrimary'],
        ['Double', 'remoteActionToggleAdmin'],
        ['Long', 'remoteActionSecondary'],
        ['TurnUpside', 'remoteActionTogglePause'],
        ['TurnRightside', 'remoteActionTogglePause'],
        ['Shake', 'remoteActionUndo'],
        ['Connect', 'remoteActionPoll']
    ],
    actionMapName: DEVICE_NAME + " Actions"
};

// Blink green for 100ms
function blinkGreen() {
	LED2.write(true);
	setTimeout(function () { LED2.write(false); }, 100);
	print("pressed");
}

// Detect button press and blink green
echo(false);
setWatch(blinkGreen, BTN, { edge: "rising", repeat: true, debounce: 50 });

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
