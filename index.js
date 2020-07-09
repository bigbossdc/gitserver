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
			// "git push" 또는 "git push --tag" 요청이 들어온 경우...
			if (type == "push" || type == "tag") {
				// 사용자 인증 실시 (Basic Authentication)
				user((username, password) => {
					// 1. 사용자 정보 & repository 정보 가져오기
					const getUserCount = sqlConn.queueQuery("select count(*) as counted from user where id = ? and password = password(?)", [username, password]);
					const getGitInfo = sqlConn.queueQuery("select * from git where user_no = (select no from user U where U.id = ?) and git_name = ?", [repoOwnerId, repoName]);
					const userCount = getUserCount()[0].counted;
					const gitInfo = getGitInfo()[0];
					console.log("[Gitbook] MySql response : ", userCount === 1 ? true : false);

					// 2. 사용자 인증 여부 확인하기
					if (userCount !== 1) {
						console.log("[Gitbook] Error : Authentication failed with user :", username);
						return reject("[Gitbook] Error : Authentication failed with user...");
					}

					// 3. 개인 repository인 경우 --> 자신의 Repository인지 확인하기 (개인 repository인 경우!)
					if (gitInfo.group_no === null && repoOwnerId != username) {
						console.log("[Gitbook] Repository ownership not matched... user:", username, " <---> repo owner:", repoOwnerId);
						return reject("[Gitbook] User is authenticated, but doesn't have an ownership of current repository...");
					}

					// 4. 해당 repository가 그룹 repository인 경우...(개인 repository가 아님!)
					if (gitInfo.group_no !== null) {
						// 해당 그룹에 속한 회원들을 조회하기
						let groupMemberList = [];
						const getGroupMemberList = sqlConn.queueQuery("select GL.user_no as user_no, U.id as id from group_list GL join user U on (GL.user_no = U.no) where group_no = ?", [gitInfo.group_no]);

						getGroupMemberList().map((memberInfo) => {
							groupMemberList.push(memberInfo.id);
						});
						console.log("Group Members: >>", groupMemberList);

						// 그룹에 속해있지 않은 경우 reject하기 (추후에 추가하기)
					}

					// 만약 이상이 없는 경우 "git push" 또는 "git push --tag" 를 받아들이기
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
