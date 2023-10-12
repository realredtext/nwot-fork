module.exports.GET = async function(req, serve, vars, evars) {
	var db = vars.db;
	var create_date = vars.create_date;
	var create_boolean = vars.create_boolean;
	var accountSystem = vars.accountSystem;
	var dispage = vars.dispage;
	var checkURLParam = vars.checkURLParam;
	
    var user = evars.user;
	var HTML = evars.HTML;
	var path = evars.path;
	
	var query_user = checkURLParam("/user_data/:username", path).username;
		
	if(!user.superuser && (query_user !== user.username)) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	var validUser = !!(await db.get("SELECT id FROM auth_user WHERE username=?", query_user));
		
	if(!validUser) {
		return serve("Invalid query, either there is no user of name "+query_user+" or your query should be \"user_data/userHere\"");
	};
	
	var res = await db.get("SELECT id, username, email, level, is_active, date_joined FROM auth_user WHERE username=?", query_user);
	var worldsOwned = await db.get("SELECT count(*) AS cnt FROM world WHERE owner_id=?", res.id);
	
	res.worlds_owned = worldsOwned.cnt;
	res.op = res.level > 2;
	res.superuser = res.level > 1;
	res.staff = res.level > 0;
	
	serve(JSON.stringify(res), null, {
		mime: "application/json"
	});
}