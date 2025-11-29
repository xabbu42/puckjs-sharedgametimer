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
    var suggestions = {
        script: [
            '0 sgtState;sgtColor;sgtTurnTime;sgtPlayerTime%0A'
        ],
        scriptName: "Pill Button Write",
        defaultTriggers: ["includePlayers","includePause","includeAdmin","includeSimultaneousTurns","includeGameStart","includeGameEnd","includeSandTimerStart","includeSandTimerReset","includeSandTimerStop","includeSandTimerOutOfTime","runOnStateChange","runOnPlayerOrderChange","runOnPoll","runOnBluetoothConnect","runOnBluetoothDisconnect"],
        actionMap: [
            ['Short Press 1', 'remoteActionPrimary'],
            ['Short Press 2', 'remoteActionToggleAdmin'],
            ['Long Press 0', 'remoteActionSecondary'],
            ['Long Press 1', 'remoteActionTogglePause'],
            ['Long Press', 'remoteActionUndo'],
            ['Connected', 'remoteActionPoll']
        ],
        actionMapName: "Pill Button Actions"
    };
    
    Bluetooth.println(JSON.stringify(suggestions));
    print("Config sent to " + addr);
});

// Transmit Bluetooth Low Energy advertising packets
NRF.setAdvertising({}, {
    showName: false,
    manufacturer: 0x0590,
    manufacturerData: JSON.stringify({ name: "Puck Player 1" })
});
