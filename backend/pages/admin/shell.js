module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;
	var csrftoken = evars.cookies.csrftoken;

	var dispage = vars.dispage;
	
	if(!user.operator) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	serve(HTML("administrator_shell.html", {
		message: params.message,
		csrftoken: csrftoken
	}));
}

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;
	
	
	var postedToken = post_data.csrfmiddlewaretoken;
	if(postedToken !== evars.cookies.csrftoken) return;
	
	var dispage = vars.dispage;
	var executeJS = vars.executeJS;

	if(!user.operator) return;
	
	var shell_script = post_data.shell_script;
	var do_async = "do_async" in post_data && post_data.do_async === "on";
	
	var res = await executeJS(shell_script, do_async);
	
	if(typeof res === "object") res = JSON.stringify(res);
	if(!shell_script) {
		return await dispage("admin/shell", {
			message: "No script given"
		}, req, serve, vars, evars);
	};
	
	return await dispage("admin/shell", {
		message: res
	}, req, serve, vars, evars);
}