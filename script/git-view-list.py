#!/usr/bin/python3
import sys
import subprocess

def getshell(command):
	return subprocess.Popen(command, shell=True, stdout=subprocess.PIPE).communicate()[0].decode('UTF-8').strip()

def getfolderinfo(username, reponame, branch, folder = ''):
	result = list()
	if folder is not None and folder != '':
		if folder[len(folder)-1] != '/':
			folder += '/'
		lines = getshell("cd /var/www/git/gitbook/{0}/{1}.git && git ls-tree --full-tree {2} {3}".format(username, reponame, branch, folder)).split('\n')
	else:
		lines = getshell("cd /var/www/git/gitbook/{0}/{1}.git && git ls-tree --full-tree {2}".format(username, reponame, branch)).split('\n')
	
	for line in lines:
		# 한 줄씩 들어왔음. /t로 구분할것
		pathname = line.split('\t')[1]
		pathnamecommand = pathname.replace(" ", "\\ ")
		typeitems = line.split('\t')[0]
		typename = 'file' if typeitems.split()[1] == 'blob' else 'folder'
		result.append(''.join([pathname, '\t', getshell('cd /var/www/git/gitbook/{0}/{1}.git && git log -1 --pretty=format:"%s\t%ar" -- {2} {3}'.format(username, reponame, branch, pathnamecommand)), '\t', typename]))
	return '\n'.join(result)

if len(sys.argv) == 4:
	print(getfolderinfo(sys.argv[1], sys.argv[2], sys.argv[3]))
elif len(sys.argv) >= 5:
	print(getfolderinfo(sys.argv[1], sys.argv[2], sys.argv[3], '\\ '.join(sys.argv[4:])))
