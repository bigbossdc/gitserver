const path = require("path");
const GitServer = require("node-git-server");
const mysql = require("sync-mysql");
const config = require("./db/sql_info").real;
const request = require("request");
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
		const repoOwnerId = repo.split("/")[1];
		const repoName = repo.split("/")[2];
		console.log("[Gitbook] Authentication info >> ", type, repo, user, repoOwnerId, repoName);

		// resolve() 또는 reject(거부 사유 메시지) 中 하나를 보낸다!!
		return new Promise(function (resolve, reject) {
			// "push" 요청이 들어온 경우...
			if (type == "push") {
				// 사용자 인증을 하도록 한다.
				user((username, password) => {
					// 1. 사용자 인증하기
					const getUserCount = sqlConn.queueQuery("select count(*) as counted from user where id = ? and password = password(?)", [username, password]);
					const userCount = getUserCount()[0].counted;
					console.log("[Gitbook] MySql response : ", userCount === 1 ? true : false);
					if (userCount !== 1) {
						console.log("[Gitbook] Error : Authorization failed with user :", username);
						return reject("[Gitbook] Error : Authorization failed with user...");
					}

					// 2. 자신의 Repository인지 확인하기
					if (repoOwnerId != username) {
						console.log("[Gitbook] Repository path not matched... user:", username, " <---> repo owner:", repoOwnerId);
						return reject("[Gitbook] Repository path not matched... user:", username, " <---> repo owner:", repoOwnerId);
					}

					// 3. 사용자의 그룹 확인 (추후에 추가할것!)

					// 최종적으로 statusCode 바탕으로 결과 처리
					return resolve();
				});
				// end of Authentication Process with user(username, password)
			} else {
				// (push가 아닌)  fetch (clone, pull 등) 요청인 경우 인증 없이 fetch 처리
				return resolve();
			}
		});
		// end of 'return new Promise(...)'
	},
});

/* --------------------------------------------------- Hook 처리 --------------------------------------------------- */

// [중요] 클라이언트 -> 서버
repos.on("push", (push) => {
	console.log(`[Gitbook] Push information >> ${push.repo} / ${push.commit} (${push.branch})`);

	push.accept();

	// Spring Boot 서버로 POST 통신을 보내기 ('request' 라이브러리 사용)
	request.post(
		{
			headers: { "content-type": "application/json" },
			url: "http://127.0.0.1:8080/gitbook/Repository/" + push.repo.split("/")[1] + "/pushProcess",
			method: "POST",
			body: push,
			json: true,
		},
		function (error, response, body) {
			if (!error && (response.statusCode == 200 || response.statusCode == 304)) {
				console.log("body : ", body);
			} else {
				console.log("error : ", error);
				console.log("body : ", body);
			}
		}
	);
});

// [중요] 클라이언트 -> 서버
repos.on("tag", (tag) => {
	console.log(`[Gitbook] Tag information >> ${tag.repo} / ${tag.commit} (${tag.branch})`);

	tag.accept();
});

// 서버 -> 클라이언트
repos.on("fetch", (fetch) => {
	console.log(`[Gitbook] Fetch information >> ${fetch.repo} / ${fetch.commit}`);

	fetch.accept();
});

repos.listen(port, () => {
	console.log(`node-git-server running at port number [${port}]`);
});
