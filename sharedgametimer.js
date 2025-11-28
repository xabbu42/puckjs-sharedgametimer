// Blink green for 100ms
function blinkGreen() {
	LED2.write(true);
	setTimeout(function () { LED2.write(false); }, 100);
	print("pressed");
}

// Detect button press and blink green
echo(false);
setWatch(blinkGreen, BTN, { edge: "rising", repeat: true, debounce: 50 });

// Transmit Bluetooth Low Energy advertising packets
NRF.setAdvertising({}, {
    showName: false,
    manufacturer: 0x0590,
    manufacturerData: JSON.stringify({ name: "Puck Player 1" })
});
