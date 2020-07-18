var mysql = require("mysql");
var connection = mysql.createConnection({
	host: "192.168.1.15",
	port: "3306",
	user: "gitbook",
	password: "gitbook",
	database: "gitbook",
});

connection.connect();
connection.query("select count(*) as counted from gitbook.user where id = ? and password = password(?)", ['test3', '123'], function (error, results, fields) {
	if (error) {
		console.log(error);
	}
	console.log(results);
});
connection.end();
