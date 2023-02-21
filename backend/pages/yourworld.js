var intv;
var handle_error;
var db;
var worldViews;
module.exports.startup_internal = function(vars) {
	intv = vars.intv;
	handle_error = vars.handle_error;
	db = vars.db;
	worldViews = vars.worldViews;

	worldViewCommit();
}

module.exports.server_exit = async function() {
	await worldViewCommit(true);
}

async function worldViewCommit(no_interval) {
	try {
		for(var i in worldViews) {
			var world_id = parseInt(i);
	
			var world = await db.get("SELECT properties FROM world WHERE id=?", world_id);
			
			var props = JSON.parse(world.properties);

			if(!props.views) props.views = 0;
			props.views += worldViews[i];

			await db.run("UPDATE world SET properties=? WHERE id=?", [JSON.stringify(props), world_id]);

			delete worldViews[i];
		}
	} catch(e) {
		handle_error(e);
	}
	if(!no_interval) intv.worldViewCommitTimeout = setTimeout(worldViewCommit, 1000 * 5);
}

module.exports.GET = async function(req, serve, vars, evars, params) {
	var query_data = evars.query_data;
	var path = evars.path;
	var user = evars.user;
	var redirect = evars.redirect;
	var HTML = evars.HTML;

	var dispage = vars.dispage;
	var db = vars.db;
	var world_get_or_create = vars.world_get_or_create;
	var can_view_world = vars.can_view_world;
	var modules = vars.modules;
	var announcement = vars.announcement();
	var san_nbr = vars.san_nbr;
	var accountSystem = vars.accountSystem;

	var world_name = path;
	if(params.timemachine) {
		world_name = params.world;
	}

	var world = await world_get_or_create(world_name);
	if(!world) return await dispage("404", null, req, serve, vars, evars);

	var world_properties = JSON.parse(world.properties);

	var read_permission = await can_view_world(world, user, db);
	if(!read_permission) {
		return dispage("accounts/private", null, req, serve, vars, evars);
	}

	if(query_data.fetch == 1) { // fetch request
		evars.timemachine = { active: params.timemachine };
		evars.world = world;
		var tiles = await modules.fetch_tiles({
			fetchRectangles: [{
				minY: query_data.min_tileY,
				minX: query_data.min_tileX,
				maxY: query_data.max_tileY,
				maxX: query_data.max_tileX
			}],
			utf16: query_data.utf16,
			array: query_data.array,
			content_only: query_data.content_only,
			concat: query_data.concat
		}, vars, evars);
		if(typeof tiles == "string") {
			return serve(tiles);
		}
		if("data" in tiles) tiles = tiles.data;
		var tData;
		if(typeof tiles == "string") {
			tData = tiles;
		} else {
			tData = JSON.stringify(tiles);
		}
		return serve(tData, null, {
			mime: "application/json; charset=utf-8"
		});
	} else { // the HTML page
		if(!query_data.hide) {
			if(!worldViews[world.id]) worldViews[world.id] = 0;
			worldViews[world.id]++;
		}

		var pathname = world.name;
		if(pathname != "") {
			pathname = "/" + pathname;
		}
		if(params.timemachine) {
			pathname = "/" + path;
			if(pathname.charAt(pathname.length - 1) == "/") pathname = pathname.slice(0, -1);
		}
		var chat_permission = world_properties.chat_permission;
		if(!chat_permission) chat_permission = 0;
		var show_cursor = world_properties.show_cursor
		if(show_cursor == void 0) show_cursor = -1;
		var color_text = world_properties.color_text;
		if(!color_text) color_text = 0;
		var username = user.username;
		if(accountSystem == "uvias") {
			username = user.display_username;
		}
		var state = {
			userModel: {
				username: username,
				is_superuser: user.superuser, // Admin of OWOT?
				authenticated: user.authenticated,
				is_member: read_permission.member || (user.superuser && world.name == ""), // Member of world?
				is_owner: read_permission.owner || (user.superuser && world.name == ""), // Owner of world?
				is_staff: user.staff, // Staff of OWOT?
				is_operator: user.operator // Operator of OWOT?
			},
			worldModel: { // mirror to world_props.js
				feature_membertiles_addremove: !!world.feature_membertiles_addremove,
				writability: world.writability,
				feature_url_link: world.feature_url_link,
				feature_go_to_coord: world.feature_go_to_coord,
				name: world.name,
				feature_paste: world.feature_paste,
				namespace: world.name.split("/")[0],
				readability: world.readability,
				feature_coord_link: world.feature_coord_link,
				pathname,
				chat_permission,
				color_text,
				show_cursor
			}
		};
		if(CONST.tileRows != 8) {
			state.worldModel.tileRows = CONST.tileRows;
		}
		if(CONST.tileCols != 16) {
			state.worldModel.tileCols = CONST.tileCols;
		}
		if(world_properties.page_is_nsfw) {
			state.worldModel.nsfw = world_properties.page_is_nsfw;
		}
		if(world_properties.square_chars) {
			state.worldModel.square_chars = true;
		}
		if(world_properties.half_chars) {
			state.worldModel.half_chars = true;
		}
		if(announcement) {
			state.announce = announcement;
		}
		if(params.timemachine) {
			state.worldModel.writability = 0;
			state.worldModel.timemachine = true;
		}
		if(world_properties.background) {
			state.background = {
				path: world_properties.background
			}
			if(world_properties.background_x) {
				state.background.x = world_properties.background_x;
			}
			if(world_properties.background_y) {
				state.background.y = world_properties.background_y;
			}
			if(world_properties.background_w) {
				state.background.w = world_properties.background_w;
			}
			if(world_properties.background_h) {
				state.background.h = world_properties.background_h;
			}
			if(world_properties.background_rmod) {
				state.background.rmod = world_properties.background_rmod;
			}
			if("background_alpha" in world_properties) {
				state.background.alpha = world_properties.background_alpha;
			}
		}
		var page_title = "Our World of Text";
		if(world.name) {
			page_title = "/" + world.name;
		}
		var meta_desc = world_properties.meta_desc;
		if(!world.name) {
			meta_desc = "";
		}
		var data = {
			state: JSON.stringify(state),
			world,
			page_title,
			nsfw: world_properties.page_is_nsfw,
			meta_desc
		}
		return serve(HTML("yourworld.html", data), null, {
			mime: "text/html; charset=utf-8"
		});
	}
}

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var path = evars.path;
	var user = evars.user;

	var db = vars.db;
	var modules = vars.modules;
	var world_get_or_create = vars.world_get_or_create;
	var can_view_world = vars.can_view_world;

	var world = await world_get_or_create(path);
	if(!world) return serve(null, 404);

	var read_permission = await can_view_world(world, user, db);
	if(!read_permission) {
		// no permission to view world?
		return serve(null, 403);
	}

	evars.world = world;
	evars.user.stats = read_permission;

	var edits_parsed;
	try {
		edits_parsed = JSON.parse(post_data.edits);
	} catch(e) {
		return serve(null, 400);
	}

	var do_write = await modules.write_data({
		edits: edits_parsed,
		bypass: post_data.bypass
	}, vars, evars);

	serve(JSON.stringify(do_write.accepted));
}