module.exports = async function(ws, data, send, vars, evars) {
	var broadcast = evars.broadcast;
	var user = evars.user;
	var world = evars.world;

	var db = vars.db;
	var san_nbr = vars.san_nbr;
	var tile_database = vars.tile_database;
	
	var is_owner = user.id === world.owner_id;
	var canClearTiles = user.superuser || is_owner;

	if(!canClearTiles) return;

	var tileX = san_nbr(data.tileX);
	var tileY = san_nbr(data.tileY);

	var properties = JSON.parse(world.properties);
	var no_log_edits = !!properties.no_log_edits;

	var call_id = tile_database.newCallId();
	tile_database.reserveCallId(call_id);

	tile_database.write(call_id, tile_database.types.clear, {
		tileX, tileY, user, world,
		date: Date.now(), no_log_edits
	});
}