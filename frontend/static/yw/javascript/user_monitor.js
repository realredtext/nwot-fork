function byId(e) {
	return document.getElementById(e);
};

var display = byId("sockets");
var message = byId("message");

var socket = new WebSocket("ws" + (window.location.protocol === "https:" ? "s" : "") + "://" + window.location.host + "/administrator/user_monitor/ws/");
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
	formattedData += ", Monitor: "+data.monitorSocket;
	formattedData += ", Channel: "+data.channel;
	formattedData += ", IP: "+data.ipAddress+"]";
	return formattedData;
}

var ws_functions = {
	umonitor_leave: function(data) {
		var user = data.user;
		
		message.innerText = `${user} left User Monitor`;
		setTimeout(() => {
			message.innerText = "";
		}, 2000);
	},
	
	umonitor_join: function(data) {
		var user = data.user;
		
		message.innerText = `${user} joined User Monitor`;
		setTimeout(()=>{
			message.innerText = "";
		}, 2000)
	},
	user_leave: function(data) {
		var channel = data.channel;
		byId(channel).remove();
	},
	user_join: function(data) {
		var clientData = data.data;
		var newLine = document.createElement("span");
		newLine.innerText = formatData(JSON.parse(clientData));
		newLine.id = JSON.parse(clientData).channel;
		newLine.appendChild(document.createElement("br"));
		display.appendChild(newLine);
	}
}