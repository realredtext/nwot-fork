module.exports.GET = async function(req, serve, vars, evars) {
	var rand = "#" + ("00000" + Math.floor(Math.random() * 16777215).toString(16)).slice(-6).toUpperCase()
	serve("<div style=\"width: 500px; height: 500px; background-color:"+rand+";\"></div><span>"+rand+"</span>");
}