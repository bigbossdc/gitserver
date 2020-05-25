module.exports = (function () {
	return {
		local: {
			// localhost
			host: "localhost",
			port: "3306",
			user: "root",
			password: "root",
			database: "test",
		},
		real: {
			// real server db info
			host: "192.168.1.15",
			port: "3306",
			user: "gitbook",
			password: "gitbook",
			database: "gitbook",
		},
		dev: {
			// dev server db info
			host: "192.168.1.15",
			port: "3306",
			user: "gitbook",
			password: "gitbook",
			database: "gitbook",
		},
	};
})();
