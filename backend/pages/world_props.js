module.exports.GET = async function(req, serve, vars, evars) {
	var query_data = evars.query_data;
	var user = evars.user;

	var db = vars.db;
	var world_get_or_create = vars.world_get_or_create;
	var can_view_world = vars.can_view_world;
	var announcement = vars.announcement();
	
	if(typeof query_data.world != "string") return serve(null, 400);
	var world = await world_get_or_create(query_data.world);
	if(!world) {
		return serve(null, 404);
	}
	var perm = await can_view_world(world, user);
	if(!perm) {
		return serve(null, 403);
	}

	var properties = JSON.parse(world.properties);

	var pathname = world.name;
	if(pathname != "") {
		pathname = "/" + pathname;
	}

	// TODO: display all properties as given in yourworld.js
	var props = {
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
		chat_permission: properties.chat_permission ? properties.chat_permission : 0,
		color_text: properties.color_text ? properties.color_text : 0,
		show_cursor: properties.show_cursor,
		meta_desc: properties.meta_desc
	}
	
	if(properties.background) {
		props.background = {
			path: properties.background
		};
		if(properties.background_x) {
			props.background.x = properties.background_x;
		};
		if(properties.background_y) {
			props.background.y = properties.background_y;
		};
		if(properties.background_w) {
			props.background.w = properties.background_w;
		};
		if(properties.background_h) {
			props.background.h = properties.background_h;
		};
		if(properties.background_rmod) {
			props.background.rmod = properties.background_rmod;
		};
		if("background_alpha" in properties) {
			props.background.alpha = properties.background_alpha;
		};
	};
	
	if(CONST.tileRows != 8) {
		props.tileRows = CONST.tileRows;
	};
	
	if(CONST.tileCols != 16) {
		props.tileCols = CONST.tileCols;
	};
	
	if(properties.page_is_nsfw) {
		props.nsfw = properties.page_is_nsfw;
	};
	
	if(properties.square_chars) {
		props.square_chars = true;
	};
	
	if(properties.half_chars) {
		props.half_chars = true;
	};

	if(announcement) {
		props.announce = announcement;
	};

	serve(JSON.stringify(props), null, {
		mime: "application/json"
	});
}