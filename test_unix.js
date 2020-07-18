var childProcess = require("child_process");

let child = childProcess.execSync(`cd /c/var/www/git/gitbook/ellisjoe@naver.com/1234.git && git show-ref --heads`, function (error, stdout, stderr) {
	console.log("stdout: " + stdout);
	console.log("stderr: " + stderr);
	if (error !== null) {
		console.log("exec error: " + error);
	}
});
