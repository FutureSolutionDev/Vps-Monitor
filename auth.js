const { spawn } = require('child_process');

function validateSystemUser(username, password) {
  if(!username || !password) return false;
  return new Promise((resolve) => {
    const sudo = spawn('sudo', ['-S', '-u', username, 'whoami']);
    let result = '';
    let error = '';
    sudo.stdout.on('data', (data) => {
      result += data.toString();
    });
    sudo.stderr.on('data', (data) => {
      error += data.toString();
    });

    sudo.on('close', (code) => {
      if (result.trim() === username.trim()) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    sudo.stdin.write(password + '\n');
    sudo.stdin.end();
  });
}

module.exports = { validateSystemUser };
