const path = require("path");
const GitServer = require("node-git-server");
const mysql = require("sync-mysql");
const config = require("./db/sql_info").real;
const requestWithPost = require("request");
const bodyParser = require("body-parser");

const port = process.env.PORT || 7005;
var sqlConn = new mysql({
	host: config.host,
	port: config.port,
	user: config.user,
	password: config.password,
	database: config.database,
});
console.log("sync-mysql 객체 생성 완료 !!!");

const repos = new GitServer(path.resolve(__dirname, "/var/www/git/"), {
	autoCreate: false,
	authenticate: ({ type, repo, user, headers }, next) => {
		console.log("[Gitbook] Authentication info >> ", type, repo, user, repo.split("/")[1]);

		// resolve() 또는 reject(거부 사유 메시지) 中 하나를 보낸다!!
		return new Promise(function (resolve, reject) {
			// "push" 요청이 들어온 경우...
			if (type == "push") {
				// 사용자 인증을 하도록 한다.
				user((username, password) => {
					console.log("[Gitbook] user info >> ", username, password);

					// 1. 사용자 인증하기
					const getUserCount = sqlConn.queueQuery("select count(*) as counted from user where id = ? and password = password(?)", [username, password]);
					const userCount = getUserCount()[0].counted;
					console.log("[Gitbook] MySql response : ", userCount === 1 ? true : false);
					if (userCount !== 1) {
						console.log("[Gitbook] Error : Authorization failed with user :", username);
						return reject("[Gitbook] Error : Authorization failed with user...");
					}

					// 2. 자신의 Repository인지 확인하기
					if (repo.split("/")[1] != username) {
						console.log("[Gitbook] Repository path not matched... user:", username, " <---> repo owner:", repo.split("/")[1]);
						return reject("[Gitbook] Repository path not matched... user:", username, " <---> repo owner:", repo.split("/")[1]);
					}

					// 3. 사용자의 그룹 확인 (추후에 추가할것!)

					// 최종적으로 statusCode 바탕으로 결과 처리
					return resolve();
				});
				// end of Authentication Process with user(username, password)
			} else {
				// (push가 아닌)  fetch (clone, pull 등) 요청인 경우 인증 없이 fetch 처리
				resolve();
			}
		});
		// end of 'return new Promise(...)'
	},
});

/* --------------------------------------------------- Hook 처리 --------------------------------------------------- */

// [중요] 클라이언트 -> 서버
repos.on("push", (push) => {
	push.accept();
	console.log(`[Gitbook] Push accepted! >> ${push.repo} / ${push.commit} (${push.branch})`);

	// Spring Boot 서버로 POST 통신을 보내기 ('request' 라이브러리 사용)
});

// 서버 -> 클라이언트
repos.on("fetch", (fetch) => {
	fetch.accept();
	console.log(`[Gitbook] Fetch accepted! >> ${fetch.repo} / ${fetch.commit}`);
});

repos.listen(port, () => {
	console.log(`node-git-server running at port number [${port}]`);
});
