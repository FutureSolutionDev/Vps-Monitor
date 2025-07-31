module.exports = {
  apps: [
    {
      name: "Monitor",
      script: "server.js",
      out_file: "/var/log/nodejs/Monitor-out.log",
      error_file: "/var/log/nodejs/Monitor-error.log",
      env: {
        NODE_ENV: "production",
        PORT: 3004
      }
    }
  ]
};
