function sanitizeColor(col) {
	var masks = ["#XXXXXX", "#XXX"];

	var hex_set = "0123456789abcdefABCDEF";
	
	for(var m = 0; m < masks.length; m++) {
		var mask = masks[m];
		var fail = false;
		for(var c = 0; c < mask.length; c++) {
			var mask_char = mask[c];
			var cmp_char = col[c];
			if(mask.length != col.length) {
				fail = true;
				break;
			}
			if(mask_char == "#" && cmp_char == "#") continue;
			if(mask_char == "X" && hex_set.indexOf(cmp_char) > -1) continue;
			fail = true;
			break;
		}
		if(!fail) {
			return col;
		}
	}

	return "#00FF00"; // checking did not pass
}

function includesAnyOf(string, list) {
	if(!list) return false;
	
	for(var member of list) {
		if(string.includes(member)) {
			return true;
		}
	}
	
	return false;
}

var chat_ip_limits = {};
var blocked_ips = {};

var id2ip = {};
var ipsChatted = [];

var idToIp;

module.exports = async function(ws, data, send, vars, evars) {
	var broadcast = evars.broadcast; // broadcast to current world
	var clientId = evars.clientId;
	var channel = evars.channel;
	var user = evars.user;
	var world = evars.world;

	var db = vars.db;
	var db_ch = vars.db_ch;
	var san_nbr = vars.san_nbr;
	var ws_broadcast = vars.ws_broadcast; // site-wide broadcast
	var chat_mgr = vars.chat_mgr;
	var html_tag_esc = vars.html_tag_esc;
	var topActiveWorlds = vars.topActiveWorlds;
	var wss = vars.wss;
	var uptime = vars.uptime;
	var ranks_cache = vars.ranks_cache;
	var accountSystem = vars.accountSystem;
	var create_date = vars.create_date;
	var blocked_phrase_list = vars.blocked_phrase_list.filter(e => !(e.startsWith("/")));
	if(blocked_phrase_list.length === 1 && blocked_phrase_list[0] === "") {
		blocked_phrase_list = []; //dont want EVERY message to be blocked
	};
	
	if(blocked_phrase_list.includes("")) {
		blocked_phrase_list = blocked_phrase_list.filter(e => !!e);
	};
	
	idToIp = function(id) {
		id = san_nbr(id);
		return id2ip[id+""];
	};

	var add_to_chatlog = chat_mgr.add_to_chatlog;

	var ipHeaderAddr = ws.sdata.ipAddress;

	var props = JSON.parse(world.properties);
	var chat_perm = props.chat_permission;
	var is_member = user.stats.member;
	var is_owner = user.stats.owner;

	// sends `[ Server ]: <message>` in chat.
	function serverChatResponse(message, location) {
		if(!location) location = data.location;
		if(!ws.sdata.blockServerChats) send({
			nickname: "[ Server ]",
			realUsername: "[ Server ]",
			id: 0,
			message: message,
			registered: true,
			location: location,
			op: true,
			admin: true,
			staff: true,
			color: "",
			kind: "chat"
		});
	}
	
	// -1: cannot chat at all
	// by default, chat_permission is 0. undefined is equivalent to 0.
	var can_chat = false;
	if(!chat_perm) can_chat = true;
	if(chat_perm === 1 && (is_member || is_owner)) can_chat = true;
	if(chat_perm === 2 && is_owner) can_chat = true;

	if(!(data.location == "global" || data.location == "page")) data.location = "page";

	if(data.location == "page" && !can_chat) {
		serverChatResponse("You do not have permission to chat here", "page");
		return;
	}

	var isMuted = blocked_ips[ipHeaderAddr];
	if(isMuted) {
		var expTime = blocked_ips[ipHeaderAddr];
		if(!expTime || typeof expTime != "number" || Date.now() >= expTime) {
			isMuted = false;
			delete blocked_ips[ipHeaderAddr];
		}
	}

	var nick = "";
	if(data.nickname) {
		nick = data.nickname + "";
	};
	
	if(!user.staff) {
		nick = nick.slice(0, 40);
	} else {
		nick = nick.slice(0, 2000);
	};
	
	var username_to_display = user.username;
	if(accountSystem == "uvias") {
		username_to_display = user.display_username;
	}

	var msg = "";
	if(data.message) {
		msg = data.message + "";
	}
	msg = msg.trim();
	msg = msg.replace(/\$id/g, ws.sdata.clientId+"")
			 .replace(/\$channel/g, ws.sdata.channel)
			 .replace(/\$username/g, username_to_display)
			 .replace(/shorts\//gi, "watch?v=");
	
	if(!msg) return;

	data.color += "";
	data.color = sanitizeColor(data.color);
	if(!data.color) data.color = "#000000";
	data.color = data.color.slice(0, 20);
	data.color = data.color.trim();

	if(!user.staff) {
		msg = msg.slice(0, 400);
	} else {
		msg = msg.slice(0, 3030);
	}
	
	if(includesAnyOf(msg, blocked_phrase_list)) {
		var res = {
			nickname: data.nickname,
			realUsername: username_to_display,
			id: ws.sdata.clientId,
			message: msg,
			registered: user.authenticated,
			location: data.location,
			op: user.operator,
			admin: user.superuser,
			staff: user.staff,
			color: data.color,
			kind: "chat"
		};
		
		if(user.authenticated && user.id in ranks_cache.users) {
			var rank = ranks_cache[ranks_cache.users[user.id]];
			res.rankName = rank.name;
			res.rankColor = rank.chat_color;
		};
			
		
		send(res);
		return;
	};
	
	var chatIdBlockLimit = 1280;

	// [rank, name, args, description, example]
	var command_list = [
		// superuser
		[2, "worlds", ["count"], "list most 1000 active worlds", "15"],
		[2, "users", null, "shows all the users on your world", null],
		[2, "getip", ["id"], "get IP by ID", "1220"],

		// staff
		[1, "channel", null, "get info about a chat channel"],
		[1, "mute", ["id", "time (seconds)"], "mute a user for all clients", "1220 100"],
		[1, "clearmutes", null, "unmute all clients"],
		[1, "mutes", null, "get all muted IPs", null],
		[1, "unmute", ["id"], "unmute a client by ID", "1220"],

		// general
		[0, "help", null, "list all commands", null],
		[0, "uptime", null, "get uptime of server", null],
		[0, "passive", null, "toggle server messages on or off", null],
		[0, "nick", ["nickname"], "change your nickname", "JohnDoe"], // client-side
		[0, "ping", null, "check the latency", null],
		[0, "warp", ["world"], "go to another world", "forexample"], // client-side
		[0, "warpserver", ["server"], "use a different server", "wss://www.yourworldoftext.com/~help/ws/"], // client-side
		[0, "gridsize", ["WxH"], "change the size of cells", "10x20"], // client-side
		[0, "block", ["id"], "mute a user", "1220"],
		[0, "test", null, "preview your name", null],
		[0, "color", ["color code"], "change your text color", "#FF00FF"], // client-side
		[0, "chatcolor", ["color code"], "change your chat color", "#FF00FF"], // client-side
		[0, "night", null, "enable night mode", null], // client-side
		[0, "day", null, "disable night mode", null], // client-side
		[0, "tell", ["id", "message"], "tell someone a secret message", "1220 The coordinates are (392, 392)"],
		[0, "whoami", null, "display your identity"],
		[0, "shortcuts", null, "list all chat shorthands", null] //client-side

		// hidden by default
		// "/search Phrase" (client) -> searches for Phrase within a 25 tile radius
		// "/stats" -> view stats of a world; only available for front page
	];

	function generate_command_list() {
		var list = [];
		for(var i = 0; i < command_list.length; i++) {
			var command = command_list[i];
			var rank = command[0];
			if(rank == 3 && user.operator) list.push(command);
			if(rank == 2 && user.superuser) list.push(command);
			if(rank == 1 && user.staff) list.push(command);
			if(rank == 0) list.push(command);
		}

		// sort the command list
		list.sort(function(v1, v2) {
			return v1[1].localeCompare(v2[1], "en", { sensitivity: "base" });
		});

		var html = "";
		html += "Command list:<br>";
		html += "<div style=\"background-color: #DADADA; font-family: monospace; font-size: 13px;\">";
		for(var i = 0; i < list.length; i++) {
			var row = list[i];
			var command = row[1];
			var args = row[2];
			var desc = row[3];
			var example = row[4];

			// display arguments for this command
			var arg_desc = "";
			if(args) {
				arg_desc += html_tag_esc("<");
				for(var v = 0; v < args.length; v++) {
					var arg = args[v];
					arg_desc += "<span style=\"font-style: italic\">" + html_tag_esc(arg) + "</span>";
					if(v != args.length - 1) {
						arg_desc += ", ";
					}
				}
				arg_desc += html_tag_esc(">");
			}

			var exampleElm = "";
			if(example && args) {
				exampleElm = "title=\"" + html_tag_esc("Example: /" + command + " " + example) +"\"";
			}

			command = "<span " + exampleElm + "style=\"color: #00006F\">" + html_tag_esc(command) + "</span>";

			var help_row = html_tag_esc("-> /") + command + " " + arg_desc + " :: " + html_tag_esc(desc);

			// alternating stripes
			if(i % 2 == 1) {
				help_row = "<div style=\"background-color: #C3C3C3\">" + help_row + "</div>";
			}

			html += help_row;
		}

		html += "</div>";

		return html;
	}

	var com = {
		worlds: function(count) {
			count = san_nbr(count);
			if(!count) count = 100;
			if(count < 1) count = 1;
			
			if(!user.superuser) {
				serverChatResponse("Invalid command: /worlds");
				return;
			};
			var lst = topActiveWorlds(count);
			var worldList = "";
			for(var i = 0; i < lst.length; i++) {
				var row = lst[i];
				if(row[1] == "") {
					row[1] = "(main)"
				} else {
					row[1] = "/" + html_tag_esc(row[1]);
				}
				worldList += "-> " + row[1] + " [" + row[0] + "]";
				if(i != lst.length - 1) worldList += "<br>"
			}
			var listWrapper = `
				<div style="background-color: #DADADA; font-family: monospace;">
					${worldList}
				</div>
			`;
			serverChatResponse("Currently loaded worlds (top " + count + "): " + listWrapper, data.location)
			return;
		},
		help: function() {
			return serverChatResponse(generate_command_list(), data.location);
		},
		users: function() {
			if(!user.superuser) {
				serverChatResponse("Invalid command: /users");
				return;
			}
		    var list = [];
			var count = 0;
			wss.clients.forEach((client) => { //TODO: clean this rats nest
				if(client.sdata.world_name === evars.world.name) {
					list[count] = "<div style=\"background-color: #DADADA;font-family: monospace;\">"+"<b>["+client.sdata.clientId+"]</b>"+": "+(client.sdata.user.username||"(anon)")+", "+client.sdata.channel+", "+(client.sdata.domain||"(awaiting)")+"</div>";
					count++;
				};
			});
			
			serverChatResponse("Users on "+"/"+evars.world.name+":<br>"+list.join(""));
		},
		getip: function(id) {
			if(!user.superuser) {
				serverChatResponse("Invalid command: /getip");
				return;
			};
			id = san_nbr(id);
			if(id < 0) return;
			
			var res = {};
			
			wss.clients.forEach((cli) => {
				if(!cli.sdata.userClient) return;
				if(cli.sdata.clientId === id) {
					res.ip = cli.sdata.ipAddress;
					if(ws.sdata.world.name !== cli.sdata.world.name) res.world = cli.sdata.world.name;
				};
			});
			
			serverChatResponse(`IP of ID ${id}${res.world?` (on world /${res.world})`:``}: ${res.ip}`);
		},
		passive: function() {
			ws.sdata.blockServerChats = !ws.sdata.blockServerChats;
			send({
				nickname: "[ Client ]",
				realUsername: "[ Client ]",
				id: 0,
				message: "Server chat blocking set to "+ws.sdata.blockServerChats,
				registered: true,
				location: data.location,
				op: true,
				staff: true,
				admin: true,
				color: "",
				kind: "chat"
			})
		},
		block: function(id) {
			if(id != "*") {
				id = san_nbr(id);
				if(id < 0) return;
			}
			var blocks = ws.sdata.chat_blocks;
			if(blocks.length >= chatIdBlockLimit) return serverChatResponse("Too many blocked IDs", data.location);
			if(blocks.indexOf(id) > -1) return;
			blocks.push(id);
			serverChatResponse("Blocked chats from ID: " + id, data.location);
		},
		uptime: function() {
			serverChatResponse("Server uptime: " + uptime(), data.location);
		},
		test: function() {
			var message = {
				nickname: nick,
				realUsername: username_to_display,
				id: clientId,
				message: "This message is only visible to you.",
				registered: user.authenticated,
				location: data.location,
				op: user.operator,
				admin: user.superuser,
				staff: user.staff,
				color: data.color,
				kind: "chat"
			};
			if(user.authenticated && user.id in ranks_cache.users) {
				var rank = ranks_cache[ranks_cache.users[user.id]];
				message.rankName = rank.name;
				message.rankColor = rank.chat_color;
			};
			
			send(message);
		},
		tell: function(id, message) {
			if(isMuted) return;
			id += "";
			message += "";
			message = message.trim();
			if(!id) {
				return serverChatResponse("No id given", data.location);
			}
			if(!message) {
				return serverChatResponse("No message given", data.location);
			}
			id = parseInt(id, 10);
			if(isNaN(id)) {
				return serverChatResponse("Invalid ID format", data.location);
			}
			id = san_nbr(id);
			var clientFound = false;
			wss.clients.forEach(function(ws) {
				if(clientFound) return;
				if(!ws.sdata.userClient) return;
				if(ws.sdata.clientId == id && ws.sdata.world.id == world.id && ws.sdata.can_chat) {
					clientFound = true;
					var privateMessage = {
						nickname: nick,
						realUsername: username_to_display,
						id: clientId,
						message: message,
						registered: user.authenticated,
						location: data.location,
						op: user.operator,
						admin: user.superuser,
						staff: user.staff,
						color: data.color,
						kind: "chat",
						privateMessage: "to_me",
						channel: channel
					};
					if(user.authenticated && user.id in ranks_cache.users) {
						var rank = ranks_cache[ranks_cache.users[user.id]];
						privateMessage.rankName = rank.name;
						privateMessage.rankColor = rank.chat_color;
					}
					ws.send(JSON.stringify(privateMessage));
					send({
						nickname: "",
						realUsername: "",
						id: ws.sdata.clientId,
						message: message,
						registered: false,
						location: data.location,
						op: false,
						admin: false,
						staff: false,
						color: "#000000",
						kind: "chat",
						privateMessage: "from_me",
						channel: channel
					});
				}
			});
			if(!clientFound) {
				return serverChatResponse("User not found", data.location);
			}
		},
		channel: async function() {
			if(!user.staff) {
				serverChatResponse("Invalide command: /channel");
				return;
			}
			var worldId = world.id;
			if(data.location == "global") worldId = 0;
			var channels = await db_ch.all("SELECT * FROM channels WHERE world_id=?", worldId);
			var count = channels.length;
			var infoLog = "Found " + count + " channel(s) for this world.<br>";
			for(var i = 0; i < count; i++) {
				var ch = channels[i];
				var name = ch.name;
				var desc = ch.description;
				var date = ch.date_created;
				infoLog += "<b>Name:</b> " + html_tag_esc(name) + "<br>";
				infoLog += "<b>Desc:</b> " + html_tag_esc(desc) + "<br>";
				infoLog += "<b>Created:</b> " + html_tag_esc(create_date(date)) + "<br>";
				infoLog += "----------------<br>";
			}
			var def = await db_ch.get("SELECT * FROM default_channels WHERE world_id=?", worldId);
			if(def && def.channel_id) {
				def = def.channel_id;
			} else {
				def = "<none>";
			}
			infoLog += "<b>Default channel id:</b> " + html_tag_esc(def) + "<br>";
			return serverChatResponse(infoLog, data.location);
		},
		mute: function(id, time) {
			if(!user.staff) {
				serverChatResponse("Invalid command: /mute");
				return;
			}
			id = san_nbr(id);
			time = san_nbr(time); // in seconds
			var clientFound = false;
			var muteDate = 0;
			wss.clients.forEach(function(ws) {
				if(clientFound) return;
				if(!ws.sdata.userClient) return;
				var searchParam = ws.sdata.clientId == id && ws.sdata.world.id == world.id;
				if(data.location == "global") {
					searchParam = ws.sdata.clientId == id;
				}
				if(searchParam) {
					clientFound = true;
					var cliIp = ws.sdata.ipAddress;
					if(!cliIp) return;
					muteDate = Date.now() + (time * 1000);
					blocked_ips[cliIp] = muteDate;
				}
			});
			if(clientFound) {
				return serverChatResponse("Muted client until " + html_tag_esc(create_date(muteDate)), data.location);
			} else {
				return serverChatResponse("Client not found", data.location);
			}
		},
		unmute: function(id) {
			id = san_nbr(id);
			if(!user.staff) {
				serverChatResponse("Invalid command: /unmute");
				return;
			};
			
			if(!blocked_ips[idToIp(id)]) {
				serverChatResponse("ID "+id.toString()+" is not muted or has not chatted yet, check mutes with /mutes.");
				return;
			};
			
			delete blocked_ips[idToIp(id)];
			var unmutedIP = idToIp(id);
			var res = "Unmuted ID "+id;
			if(user.superuser) res += ", IP "+unmutedIP;
			serverChatResponse(res);
		},
		mutes: function() {
			if(!user.staff) {
				serverChatResponse("Invalid command: /mutes");
				return;
			};
			if(JSON.stringify(blocked_ips) === "{}") {
				serverChatResponse("No muted IPs.");
				return;
			}
			var list = [];
			for(var i in blocked_ips) {
				list.push(`${i}: expires at ${create_date(blocked_ips[i])}`);
			};
			
			for(var i = 0; i < list.length; i++) {
				list[i] = `<div style="background-color: #DADADA;font-family: monospace;">${list[i]}</div>`;		
			};
			serverChatResponse(`Muted IPs:<br>${list.join("")}`);
		},
		clearmutes: function() {
			if(!user.staff) {
				serverChatResponse("Invalid command: /clearmutes");
				return;
			}
			var cnt = 0;
			for(var i in blocked_ips) {
				delete blocked_ips[i];
				cnt++;
			}
			return serverChatResponse("Unmuted " + cnt + " user(s)", data.location);
		},
		whoami: function() {
			var idstr = "Who Am I:<br>";
			var user_login = "(anonymous)";
			var user_disp = "(anonymous)";
			if(user.authenticated) {
				user_disp = username_to_display;
				if(accountSystem == "uvias") {
					user_login = user.username;
				} else {
					user_login = user_disp;
				}
			}
			if(accountSystem === "uvias") {
				idstr += "Login username: " + user_login + "<br>";
			};
			idstr += "Display username: " + user_disp + "<br>";
			idstr += "Chat ID: " + clientId;
			return serverChatResponse(idstr, data.location);
		},
		stats: function() {
			var stat = "Stats for "+(world.name||"(main)")+"<br>";
			stat += "Creation date: " + html_tag_esc(create_date(world.created_at)) + "<br>";
			var props = JSON.parse(world.properties);
			var viewcount = props.views;
			if(!viewcount) props.views = 0;
			stat += "View count: " + html_tag_esc(viewcount);
			return serverChatResponse(stat, data.location);
		}
	}

	var isCommand = false;
	// This is a command
	if(msg[0] == "/") {
		var args = msg.substr(1).split(" ");
		var command = args[0].toLowerCase();
		isCommand = true;

		var operator = user.operator;
		var superuser = user.superuser;
		var staff = user.staff;

		switch(command) {
			case "worlds":
				if(superuser) com.worlds(args[1]);
				return;
			case "help":
				com.help();
				return;
			case "uptime":
				com.uptime();
				return;
			case "test":
				com.test();
				return;
			case "block":
				com.block(args[1]);
				return;
			case "users":
				if(user.superuser) com.users();
				return;
			case "passive":
				com.passive();
				return;
			case "tell":
				com.tell(args[1], args.slice(2).join(" "));
				return;
			case "channel":
				if(staff) com.channel();
				return;
			case "mute":
				if(staff) com.mute(args[1], args[2]);
				return;
			case "unmute":
				if(staff) com.unmute(args[1]);
				return;
			case "clearmutes":
				if(staff) com.clearmutes();
				return;
			case "getip":
				if(superuser) com.getip(args[1]);
				return;
			case "whoami":
				com.whoami();
				return;
			case "mutes":
				if(staff) com.mutes();
				return;
			case "stats":
				com.stats();
				return;
			default:
				serverChatResponse("Invalid command: " + html_tag_esc(msg));
		}
	}

	var msNow = Date.now();

	var second = Math.floor(msNow / 1000);
	var chatsEverySecond = 2;
	if(isCommand) chatsEverySecond = 512;

	// chat limiter
	if(!chat_ip_limits[ipHeaderAddr]) {
		chat_ip_limits[ipHeaderAddr] = {};
	}
	var cil = chat_ip_limits[ipHeaderAddr];
	if(cil.lastChatSecond != second) {
		cil.lastChatSecond = second;
		cil.chatsSentInSecond = 0;
	} else {
		if(cil.chatsSentInSecond >= chatsEverySecond - 1) {
			if(!user.staff) {
				serverChatResponse("You are chatting too fast.", data.location);
				return;
			}
		} else {
			cil.chatsSentInSecond++;
		}
	}

	var chatData = {
		nickname: nick,
		realUsername: username_to_display,
		id: clientId,
		message: msg,
		registered: user.authenticated,
		location: data.location,
		op: user.operator,
		admin: user.superuser,
		staff: user.staff,
		color: data.color
	};

	if(user.authenticated && user.id in ranks_cache.users) {
		var rank = ranks_cache[ranks_cache.users[user.id]];
		chatData.rankName = rank.name;
		chatData.rankColor = rank.chat_color;
	}

	var isCommand = false;
	if(msg.startsWith("/")) {
		isCommand = true;
	}
	
	if(!isCommand && !user.operator) {
		msg = html_tag_esc(msg);
	};

	if(!isCommand && !isMuted) {
		if(data.location == "page") {
			await add_to_chatlog(chatData, world.id);
		} else if(data.location == "global") {
			await add_to_chatlog(chatData, 0);
		}
	}

	if(isMuted) return;
	var websocketChatData = Object.assign({
		kind: "chat",
		channel
	}, chatData);

	var chatOpts = {
		// Global and Page updates should not appear in worlds with chat disabled
		chat_perm,
		isChat: true,
		clientId
	};

	if(!isCommand) {
		if(data.location == "page") {
			broadcast(websocketChatData, chatOpts);
		} else if(data.location == "global") {
			ws_broadcast(websocketChatData, void 0, chatOpts);
		}
		id2ip[websocketChatData.id] = ws.sdata.ipAddress;
		ipsChatted.push(ws.sdata.ipAddress);
	}
}