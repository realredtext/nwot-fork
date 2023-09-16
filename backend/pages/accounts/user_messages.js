//expert ^c ^v
var intv;
module.exports.startup_internal = function(vars) {
	intv = vars.intv;

	// wait at least 5 minutes and then allow user to download again
	intv.accountTimeCheck = setInterval(function() {
		var date = Date.now();
		for(var i in time_limits) {
			if(time_limits[i] + wait_ms >= date) {
				delete time_limits[i];
			}
		}
	}, 1000 * 8) // check every 8 seconds if the time is up
}

var wait_ms = 1000 * 60 * 2;
var time_limits = {};

module.exports.GET = async function(req, serve, vars, evars) {
	var path = evars.path;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var checkURLParam = vars.checkURLParam;
	var db_ch = vars.db_ch;
	var db = vars.db;
	var filename_sanitize = vars.filename_sanitize;
	
	var username = checkURLParam("/accounts/user_messages/:username", path).username;
	
	var specifiedUser = await db.get("SELECT * FROM auth_user WHERE username=?", username);
	
	if(!specifiedUser) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	//perms
	var allowed = user.superuser || username===evars.username;
	if(!allowed) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	if(!user.superuser) { //xprt ^c ^v
		if(time_limits[user.id]) {
			return serve("Wait about 2 minutes until next download.");
		} else {
			time_limits[user.id] = Date.now();
		};
	};
	
	var userID = specifiedUser.id;
	
	var sentMessages = await db_ch.all("SELECT data FROM entries");
	sentMessages = sentMessages.map(object => JSON.parse(object.data)).filter(message => message.realUsername === username);
	
	serve(JSON.stringify(sentMessages), null, {
		mime: "application/json; charset=utf8",
		download_file: filename_sanitize("User_" + username + ".json")
	});
}