module.exports.GET = async function(req, serve, vars, evars) {
	var db = vars.db;
	var create_date = vars.create_date;
	
    var user = evars.user;
	var HTML = evars.HTML;
	var query_data = evars.query_data;
	var query_user = query_data.user;
	if(!user.superuser && (query_user !== user.username)) {
		return serve(HTML("404.html"));
	};
	
	var users = await db.all("SELECT username FROM auth_user");
	var validUser = Object.values(users).map(function(user) {
		return user.username;
	}).includes(query_user);
	
	if(!validUser) {
		serve("Invalid query, your query should be \"?q=usernameHere\"");
	};
	
	var res = await db.get("SELECT id, username, email, level, is_active, date_joined FROM auth_user WHERE username=?", query_user);
	res.date_joined = create_date(res.date_joined);
	
	
	serve(JSON.stringify(res), null, {
		mime: "application/json"
	});
}