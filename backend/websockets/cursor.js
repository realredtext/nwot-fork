module.exports = async function(ws, data, send, vars, evars) {
	var san_nbr = vars.san_nbr;
	var client_cursor_pos = vars.client_cursor_pos;
	var wss = vars.wss;
	var WebSocket = vars.WebSocket;

	var broadcast = evars.broadcast; // broadcast to current world
	var user = evars.user;
	var channel = evars.channel;
	var world = evars.world;

	var worldId = world.id;

	ws.sdata.hasBroadcastedCursorPosition = true;

	var is_member = user.stats.member;
	var is_owner = user.stats.owner;

	var show_cursor = ws.sdata.show_cursor;
	if(show_cursor == void 0) show_cursor = -1;

	if(show_cursor == -1) return;
	if(show_cursor == 1 && !is_member && !is_owner) return;
	if(show_cursor == 2 && !is_owner) return;

	if(!client_cursor_pos[worldId]) {
		client_cursor_pos[worldId] = {};
	}
	var world_csr_list = client_cursor_pos[worldId];
	if(!world_csr_list[channel]) {
		world_csr_list[channel] = {
			tileX: 0, tileY: 0,
			charX: 0, charY: 0,
			hidden: false
		};
	}
	var cli_csr = world_csr_list[channel];

	var position = data.position;
	var hidden = data.hidden;
	if(typeof position == "object" && !Array.isArray(position)) {
		var tileX = san_nbr(position.tileX);
		var tileY = san_nbr(position.tileY);
		var charX = san_nbr(position.charX);
		var charY = san_nbr(position.charY);
		if(charX < 0) charX = 0;
		if(charY < 0) charY = 0;
		if(charX >= CONST.tileCols) charX = CONST.tileCols;
		if(charY >= CONST.tileRows) charY = CONST.tileRows;
		ws.sdata.cursorPositionHidden = false;
		wss.clients.forEach(function(client) {
			if(!client.sdata.userClient) return;
			if(client.sdata.world_id == worldId && client.readyState == WebSocket.OPEN) {
				var cli_channel = client.sdata.channel;
				var cli_tileX = 0;
				var cli_tileY = 0;
				if(world_csr_list[cli_channel]) {
					var cli_cursor = world_csr_list[cli_channel];
					cli_tileX = cli_cursor.tileX;
					cli_tileY = cli_cursor.tileY;
				}
				var dist = (cli_tileX - tileX) ** 2 + (cli_tileY - tileY) ** 2;
				if(dist > 128 * 128) return; // do not broadcast the cursor further than 128 tiles from this client's cursor
				try {
					client.send(JSON.stringify({
						kind: "cursor",
						position: {
							tileX, tileY,
							charX, charY
						},
						channel: channel
					}));
				} catch(e) {
					handle_error(e);
				}
			}
		});
		cli_csr.hidden = false;
		cli_csr.tileX = tileX;
		cli_csr.tileY = tileY;
		cli_csr.charX = charX;
		cli_csr.charY = charY;
	} else if(hidden) {
		ws.sdata.cursorPositionHidden = true;
		broadcast({
			kind: "cursor",
			hidden: true,
			channel: channel
		});
		cli_csr.hidden = true;
	}
}