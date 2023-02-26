module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;

	var dispage = vars.dispage;
	var db = vars.db;

	if(!user.superuser) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	serve(HTML("administrator_world_search.html", {
		message: params.message,
		worlds: params.worlds
	}));
};

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var db = vars.db;
	
	if(!user.superuser) return;
	
	var searchQuery = post_data.search_query;
	var worldCount = 0;
	
	if(searchQuery.length < 1 || ! (/^([\w\/\.\-\~]*)$/g.test(searchQuery))) {
		return await dispage("admin/world_search", {
			message: "Invalid search query"
		}, req, serve, vars, evars);
	};
	
	var worlds = await db.all("SELECT name, properties FROM world WHERE name LIKE ? || '%' ORDER BY name", searchQuery);
		
	for(var world of worlds) {
		world.properties = JSON.parse(world.properties);
		world.views = (world.properties.views ?? 0).toString();
		worldCount++;
	};
	
	if(worldCount === 0) {
		return await dispage("admin/world_search", {
			message: "No worlds with query \""+searchQuery+"\" were found."
		}, req, serve, vars, evars)
	} else {
		return await dispage("admin/world_search", {
			message: worldCount+" worlds found",
			worlds: worlds
		}, req, serve, vars, evars);
	};
};
