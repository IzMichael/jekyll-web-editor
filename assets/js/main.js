var ghtoken = window.localStorage.getItem('ghtoken') || '';
var ghuser = window.localStorage.getItem('ghuser') || '';
var ghrepo = window.localStorage.getItem('ghrepo') || '';
var ghbranch = window.localStorage.getItem('ghbranch') || '';

document.getElementById('token-input').value = ghtoken;
document.getElementById('user-input').value = ghuser;
document.getElementById('repo-input').value = ghrepo;
document.getElementById('branch-input').value = ghbranch;

var editing = '';
var editingSHA = '';

var md = window.markdownit();

var filetree = [];
getTree('md');
header();

function header() {
    var repotitle = document.createElement('h1');
    repotitle.innerHTML = ghrepo;
    var branchtitle = document.createElement('h1');
    branchtitle.innerHTML = ghbranch;
    document.getElementById('nav-header').appendChild(repotitle);
    document.getElementById('nav-header').appendChild(branchtitle);
}

function settings(id) {
    document.getElementById('tree-container').classList.toggle('hidden');
    document.getElementById('settings-container').classList.toggle('hidden');
}

function savesettings() {
    ghtoken = document.getElementById('token-input').value;
    ghuser = document.getElementById('user-input').value;
    ghrepo = document.getElementById('repo-input').value;
    ghbranch = document.getElementById('branch-input').value;

    window.localStorage.setItem('ghtoken', ghtoken);
    window.localStorage.setItem('ghuser', ghtoken);
    window.localStorage.setItem('ghrepo', ghtoken);
    window.localStorage.setItem('ghbranch', ghtoken);
}

async function getTree(filter) {
    document.getElementById('tree-container').innerHTML = '';
    filetree = [];

    var apitree = await fetch('https://api.github.com/repos/' + ghuser + '/' + ghrepo + '/git/trees/' + ghbranch + '?recursive=1', {
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/vnd.github.v3+json',
            'Authorization': 'token ' + ghtoken
        }
    }).then(res => {
        return res.json()
    })

    for (let i = 0; i < apitree.tree.length; i++) {
        const file = apitree.tree[i];
        filetree.push(file.path)
    }

    if (filter == 'md') {
        filetree = filetree.filter(a => a.endsWith('.md') || a.endsWith('.markdown'));
    } else if (filter == 'img') {
        filetree = filetree.filter(a => a.endsWith('.png') || a.endsWith('.jpg') || a.endsWith('.jpeg') || a.endsWith('.gif'));
    }

    filetree = treeify(filetree);

    document.getElementById('tree-container').appendChild(parseNodes(filetree));
    document.querySelector('#tree-container').firstChild.classList.remove('hidden', 'ml-4')
}

function parseNodes(nodes) {
    nodes.sort((a, b) => (a.children.length < b.children.length) ? 1 : -1);

    var list = document.createElement('div');
    list.classList.add('ml-4', 'hidden', 'bg-white', 'w-full')
    for (var i = 0; i < nodes.length; i++) {
        list.appendChild(parseNode(nodes[i]));
    }
    return list;
}

function parseNode(node) {
    var file = document.createElement('div');

    var text = document.createElement('p');
    text.innerHTML = node.name;
    text.classList.add('p-2', 'bg-gray-500', 'text-white', 'mb-2', 'w-full')

    if (node.children.length > 0) {
        text.setAttribute('onclick', 'javascript:togglefolder(this)');
        text.classList.add('folder-closed', 'cursor-pointer');
    } else {
        text.setAttribute('onclick', 'javascript:editfile(\'' + node.fullpath + '\')');
        text.classList.add('file', 'cursor-pointer');
    }

    file.appendChild(text)

    file.classList.add('mb-2')
    if (node.children.length > 0) file.appendChild(parseNodes(node.children));
    return file;
}

function togglefolder(el) {
    el.classList.toggle('folder-open');
    el.classList.toggle('folder-closed');
    el.nextSibling.classList.toggle('hidden');
}

async function editfile(path) {
    editing = path;
    var file = await fetch('https://api.github.com/repos/' + ghuser + '/' + ghrepo + '/contents/' + path, {
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/vnd.github.v3+json',
            'Authorization': 'token ' + ghtoken
        }
    }).then(res => {
        return res.json()
    })

    let ext = path.split('.').at(-1);
    if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'gif') {
        // Images

        console.log(file)
        document.getElementById('edit-preview').innerHTML = '<img src="https://therosyshell.co.nz/' + path + '">';

        editTab('preview');
    } else {
        // Non-Images

        file.content = window.atob(file.content);

        editingSHA = file.sha;

        document.getElementById('edit-path').value = '/' + path;
        document.getElementById('edit-content').value = file.content;

        preview();
    }
}

function preview() {
    let ext = editing.split('.').at(-1);

    if (ext == 'html') {
        document.getElementById('edit-preview').innerHTML = document.getElementById('edit-content').value.split('\n').join('<br>');
    } else if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'gif') {
        return
    } else {
        document.getElementById('edit-preview').innerHTML = md.render(document.getElementById('edit-content').value).split('\n').join('<br>');
    }
}

function editTab(tab) {
    document.getElementById('edit-content').classList.add('hidden');
    document.getElementById('edit-preview').classList.add('hidden');

    document.getElementById('edit-' + tab).classList.remove('hidden');
    preview()
}

async function savefile() {
    await fetch('https://api.github.com/repos/' + ghuser + '/' + ghrepo + '/contents/' + editing, {
        headers: {
            'Content-Type': 'application/json',
            'accept': 'application/vnd.github.v3+json',
            'Authorization': 'token ' + ghtoken
        },
        method: 'PUT',
        body: JSON.stringify({
            'message': '[Web Editor] Updated File: ' + editing.split('/').at(-1),
            'content': window.btoa(document.getElementById('edit-content').value),
            'sha': editingSHA
        })
    });

    document.getElementById('edit-path').value = '';
    document.getElementById('edit-content').value = '';

    getTree()
}

function treeify(paths) {
    var result = paths.reduce((r, p) => {
        var names = p.split('/');
        names.reduce((q, name) => {
            var temp = q.find(o => o.name === name);
            let ext;
            if (p.split('.').length > 1) {
                ext = p.split('.').at(-1);
            } else {
                ext = 'other'
            }
            if (!temp) q.push(temp = {
                name,
                fullpath: p,
                type: ext,
                children: []
            });
            return temp.children;
        }, r);
        return r;
    }, []);

    return result;
}