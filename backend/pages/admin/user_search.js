module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var db = vars.db;
	var accountSystem = vars.accountSystem;
	var create_date = vars.create_date;
	
	if(!user.superuser) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	serve(HTML("administrator_user_search.html", {
		message: params.message,
		users: params.users
	}));
};

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var db = vars.db;
	var create_date = vars.create_date;
	
	if(!user.superuser) return;
	
	var searchQuery = post_data.search_query;
	var userCount = 0;
	
	if(searchQuery.length < 1 || ! (/^([\w\/\.\-]*)$/g.test(searchQuery))) {
		return await dispage("admin/user_search", {
			message: "Invalid search query"
		}, req, serve, vars, evars);
	} else {
		var users = await db.all("SELECT * FROM auth_user");
		var usernamesWithQuery = [];
		
		for(var user in users) {
			var u = users[user];
			if(u.username.includes(searchQuery)) {
				usernamesWithQuery.push(u);
				userCount++;
				
				u.last_login = create_date(u.last_login);
				u.date_joined = create_date(u.date_joined);
				
				var worlds_owned = await db.get("SELECT count(*) AS cnt FROM world WHERE owner_id=?", u.id);
				u.worlds_owned = worlds_owned.cnt;
			};
		};
		if(userCount === 0 && usernamesWithQuery.length === 0) {
			return await dispage("admin/user_search", {
				message: "No users with query \""+searchQuery+"\" were found."
			}, req, serve, vars, evars)
		} else {
			return await dispage("admin/user_search", {
				message: userCount+" users found",
				users: usernamesWithQuery
			}, req, serve, vars, evars);
		}
	};
}