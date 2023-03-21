function byId(e) {
	return document.getElementById(e);
};

var display = byId("sockets");
var message = byId("message");

var socket = new WebSocket("ws" + (window.location.protocol === "https:" ? "s" : "") + "://" + window.location.host + "/administrator/user_monitor/ws/");
(() => { //onload check for whether or not to show the border
	updateDisplayBorder();
})()
socket.onmessage = function(msg) {
	var data = JSON.parse(msg.data);
	
	if(ws_functions[data.kind]) ws_functions[data.kind](data);
};

function formatData(data) {
	if(typeof data !== typeof {}) return;

	let formattedData = "[";
	formattedData += "World: "+data.world;
	formattedData += ", Name: "+data.user;
	formattedData += ", Level: "+data.level;
	formattedData += ", ID: "+data.clientId;
	formattedData += ", Channel: "+data.channel;
	formattedData += ", IP: "+data.ipAddress+"]";
	return formattedData;
};

function updateDisplayBorder() {
	if(display.childElementCount) {
		display.style.border = "3px solid #AAA";
	} else {
		display.style.border = "0px";
	}
}

var ws_functions = {
	umonitor_leave: function(data) {
		var user = data.user;
		
		message.innerText = `- ${user}`;
		message.style.color = "#FF0000";
		setTimeout(() => {
			message.innerText = "";
			message.style.color = "#000000";
		}, 2000);
	},
	
	umonitor_join: function(data) {
		var user = data.user;
		
		message.innerText = `+${user}`;
		message.style.color = "#00BB00";
		setTimeout(() => {
			message.innerText = "";
			message.style.color = "#000000";
		}, 2000);
	},
	user_leave: function(data) {
		var channel = data.channel;
		byId(channel).remove();
		updateDisplayBorder();
	},
	user_join: function(data) {
		var clientData = data.data;
		var newLine = document.createElement("div");
		newLine.innerText = formatData(JSON.parse(clientData));
		newLine.id = JSON.parse(clientData).channel;
		display.appendChild(newLine);
		
		updateDisplayBorder();
	}
};