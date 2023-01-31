module.exports = async function(ws, data, send, vars, evars) {
	var user = evars.user;

	if("block_server_chats" in data) ws.sdata.blockServerChats = Boolean(data.block_server_chats);
	if("cmd_info" in data && user.superuser) ws.sdata.extraCmdInfo = Boolean(data.cmd_info);
	if("updates" in data) ws.sdata.updates = Boolean(data.updates);
	
	if("help" in data) {
		var response = {
			kind: "cfg_help",
			block_server_chats: "Disable chat responses from [ Server ]",
			updates: "Disable tile updates"
		};
		
		if(user.superuser) response.extended_cmd_info = "Receive IP, ID, and Username from CMD messages";
		send(response);
	};
	
	if(data.response) {
		var response = {
			kind: "cfg_response",
			block_server_chats: ws.sdata.blockServerChats,
			updates: ws.sdata.updates
		};
		if(user.superuser) response.cmd_info = ws.sdata.extraCmdInfo;
		send(response);
	}
}