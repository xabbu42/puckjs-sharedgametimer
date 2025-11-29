var DEVICE_NAME = "Puck.js";
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

// Detect button press and blink green
echo(false);
setWatch(single, BTN, { edge: "rising", repeat: true, debounce: 50 });

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
