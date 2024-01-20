module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;

	var db = vars.db;
	var dispage = vars.dispage;
	var create_date = vars.create_date;

	if(!user.operator) {
		return await dispage("404", null, req, serve, vars, evars);
	}

	var worlds = await db.all("SELECT id, name, properties, owner_id, created_at, writability, readability FROM world");

	for(var world of worlds) {
		if(world.properties === "{}") {
			world.views = 0;
		} else {
			world.properties = JSON.parse(world.properties);
			world.views = world.properties.views;
			delete world.properties;
		}
		world.owner_id = (await db.get("SELECT username FROM auth_user WHERE id=?", world.owner_id)).username;
		world.owner = world.owner_id;
		delete world.owner_id;
	};

	var data = {
		worlds
	}

	serve(HTML("administrator_world_list.html", data));
}