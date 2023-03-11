module.exports.GET = async function(req, serve, vars, evars) {
	var db = vars.db;
	var create_date = vars.create_date;
	var create_boolean = vars.create_boolean;
	var accountSystem = vars.accountSystem;
	var dispage = vars.dispage;
	
    var user = evars.user;
	var HTML = evars.HTML;
	var query_data = evars.query_data;
	
	var query_user = query_data.user;
	var clean_date = create_boolean(query_data.clean_date);
	
	if(!user.superuser && (query_user !== user.username)) {
		return await dispage("404", {}, req, serve, vars, evars);
	};
	
	var users = await db.all("SELECT username FROM auth_user");
	var validUser = Object.values(users).map(function(user) {
		return user.username;
	}).includes(query_user);
	
	if(!validUser) {
		return serve("Invalid query, either there is no user of name "+query_user+" or your query should be \"?q=usernameHere\"");
	};
	
	var res = await db.get("SELECT id, username, email, level, is_active, date_joined FROM auth_user WHERE username=?", query_user);
	var worldsOwned = await db.get("SELECT count(*) AS cnt FROM world WHERE owner_id=?", res.id);
	
	res.worlds_owned = worldsOwned.cnt;
	if(clean_date) res.date_joined = create_date(res.date_joined);
	res.op = res.level > 2;
	res.superuser = res.level > 1;
	res.staff = res.level > 0;
	
	serve(JSON.stringify(res), null, {
		mime: "application/json"
	});
}