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
        folder = folder.replace('?', " ")
        files = getshell("cd /var/www/git/gitbook/{0}/{1}.git && git ls-tree --full-tree --name-status {2} {3}".format(username, reponame, branch, folder)).split()
    else:
        files = getshell("cd /var/www/git/gitbook/{0}/{1}.git && git ls-tree --full-tree --name-status {2}".format(username, reponame, branch)).split()

    for f in files:
        result.append(''.join([f, '\t', getshell('cd /var/www/git/gitbook/{0}/{1}.git && git log -1 --pretty=format:"%s\t%ar" -- {2} {3}'.format(username, reponame, branch, f))]))
    return '\n'.join(result)

if len(sys.argv) == 4:
    print(getfolderinfo(sys.argv[1], sys.argv[2], sys.argv[3]))
elif len(sys.argv) == 5:
    print(getfolderinfo(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]))