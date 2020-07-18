const mysql = require("sync-mysql");
const config = require("./db/sql_info").real;

var sqlConn = new mysql({
	host: "192.168.1.15",
	port: config.port,
	user: config.user,
	password: config.password,
	database: config.database,
});

// const userCount = sqlConn.query('select count(*) as counted from user where id = ? and password = password(?)', ['test3', '123'])[0].counted;
// const userCountFunc = sqlConn.queueQuery('select count(*) as counted from user where id = ? and password = password(?)', ['test3', '123']);
// const userCount2 = sqlConn.query('select count(*) as counted from user where id = ? and password = password(?)', ['test3', '123'])[0].counted;
// const userCountFunc2 = sqlConn.queueQuery('select count(*) as counted from user where id = ? and password = password(?)', ['test3', '123']);

// console.log(userCount , typeof(userCount), "from first");
// console.log(userCount2, typeof(userCount2), "from 3rd");

// const result1 = userCountFunc()[0].counted;
// const result2 = userCountFunc2()[0].counted;
// console.log(result1, typeof(result1), "from 2nd");
// console.log(result2, typeof(result2), "from 4th");

let repo = "gitbook/ellisjoe@naver.com/group01";
const repoOwnerId = "ellisjoe@naver.com";
const repoName = repo.split("/").pop();
const getGitInfo = sqlConn.queueQuery("select * from git where user_no = (select no from user U where U.id = ?) and git_name = ?", [repoOwnerId, repoName]);
const gitInfo = getGitInfo()[0];
console.log("Repository Info >>", gitInfo);

if(gitInfo === null || gitInfo === undefined){
	console.log("not found...");
}

else if (gitInfo.group_no !== null) {
	let groupMemberList = [];
	const getGroupMemberList = sqlConn.queueQuery("select GL.user_no as user_no, U.id as id from group_list GL join user U on (GL.user_no = U.no) where group_no = ?", [gitInfo.group_no]);

	getGroupMemberList().map((memberInfo) => {
		groupMemberList.push(memberInfo.id);
	});
	console.log("그룹 맴버 목록>>", groupMemberList);
}
