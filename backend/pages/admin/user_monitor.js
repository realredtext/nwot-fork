module.exports.GET = async function(req, serve, vars, evars) {
	var HTML = evars.HTML;
	var user = evars.user;
	
	var umsCount = vars.umsCount;
	var dispage = vars.dispage;
	var wss = vars.wss;
	
	if(!user.superuser) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	function getLevel(user) {
		if(user.operator) return 3;
		if(user.superuser) return 2;
		if(user.staff) return 1;
		return 0;
	};
	
	var list = [];
	wss.clients.forEach(function(client) {
		var sdata = client.sdata;
		if(sdata.uMonitorSocket) return;
		if(sdata.monitorSocket) return;
 		var data = {
			level: getLevel(sdata.user),
			username: sdata.user.username,
			clientId: sdata.clientId,
			world: sdata.world.name || "(main)",
			channel: sdata.channel,
			ipAddress: sdata.ipAddress
		};
		list.push(data);
	});
	
	serve(HTML("user_monitor.html", {
		socket_list: list
	}));
}