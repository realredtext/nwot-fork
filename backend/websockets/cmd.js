module.exports = async function(ws, data, send, vars, evars) {
	var broadcast = evars.broadcast; // broadcast to current world
	var user = evars.user;
	var channel = evars.channel;
	var world = evars.world;

	var data_rec = data.data;
	var globalBroadcast = data.global_broadcast;
	if(!user.operator && globalBroadcast) globalBroadcast = false;
	
	var wss = vars.wss;
	var NCaseCompare = vars.NCaseCompare;
	var accountSystem = vars.accountSystem;

	// rate limit commands
	var msNow = Date.now();

	var second = Math.floor(msNow / 1000);
	var commandsEverySecond = 192;

	if(ws.sdata.lastCmdSecond != second) {
		ws.sdata.lastCmdSecond = second;
		ws.sdata.cmdsSentInSecond = 0;
	} else {
		if(ws.sdata.cmdsSentInSecond >= commandsEverySecond) {
			if(!user.operator) {
				return;
			}
		} else {
			ws.sdata.cmdsSentInSecond++;
		}
	}

	var cdata = {
		kind: "cmd",
		data: (data_rec + "").slice(0, 2048),
		sender: channel,
		source: "cmd"
	};
	if(globalBroadcast && user.operator) cdata.globalBroadcast = globalBroadcast;

	if(data.include_username && user.authenticated) {
		var username = user.username;
		if(accountSystem == "uvias") {
			username = user.display_username;
		}
		cdata.username = username;
		cdata.id = user.id;
		if(accountSystem == "uvias") {
			cdata.uid = cdata.uid.substr(1).toUpperCase().padStart(16, "0");
		}
	}

	data = JSON.stringify(cdata);
	
	wss.clients.forEach(function(client) {
		if(!client.sdata.userClient) return;
		try {
			if(client.readyState == 1 && (user.operator && globalBroadcast)) {
				if(!client.sdata.handleCmdSockets) return;
				client.send(data);
			} else if(client.readyState == 1 && !globalBroadcast && NCaseCompare(client.sdata.world_name, world.name)) {
				if(!client.sdata.handleCmdSockets) return;
				if(client.sdata.user.superuser && client.sdata.extraCmdInfo) {
					data = JSON.parse(data);
					data.ip = ws.sdata.ipAddress;
					data.username = user.username;
					data.id = evars.clientId;
					
					data = JSON.stringify(data);
				};
				client.send(data);
			}
		} catch(e) {}
	});
}