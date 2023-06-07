module.exports.GET = async function(req, serve, vars, evars) {
	var checkURLParam = vars.checkURLParam;
	var dispage = vars.dispage;
	var db = vars.db;
	var db_ch = vars.db_ch;
	var world_get_or_create = vars.world_get_or_create;
	
	var user = evars.user;
	var superuser = user.superuser;
	var path = evars.path;
	
	var worldName = checkURLParam("/accounts/chathistory/*world", path).world;
	var world = await world_get_or_create(worldName);
	
	var isOwner = user.id === world.owner_id;
	
	var allowed = superuser || isOwner;
	
	if(!allowed || !world) {
		return await dispage("404", null, req, serve, vars, evars);
	};
		
	var worldChannel = await db_ch.get("SELECT channel_id FROM default_channels WHERE world_id=?", world.id);
	worldChannel = worldChannel.channel_id;
	var entries = await db_ch.all("SELECT data FROM entries WHERE channel=?", worldChannel);
	
	entries = entries.map(function(entry) {
		return JSON.parse(entry.data);
	});
	
	entries.sort(function(a, b) {
		return a.date - b.date;
	});
	
	serve(JSON.stringify(entries), null, {
		mime: "application/json"
	});
}