const express = require("express");
const session = require("express-session");
const path = require("path");
const { validateSystemUser } = require("./auth");
const os = require("os");
const { exec } = require("child_process");

const app = express();
const PORT = 3004;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.redirect("/");
}

// Login View
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

// Dashboard (protected)
app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/dashboard.html"));
});
// Not Found View
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "views/notfound.html"));
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const isValid = await validateSystemUser(username, password);
  if (isValid) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.redirect("/dashboard");
  } else {
    return res.send(`
      <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100dvh;
      flex-direction: column;
      ">
      <h2>Login failed. </h2>
      <a href="/"
      style="
      text-decoration: none;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      border-radius: 5px;
      "
      >Try again</a>
      </div>
      `);
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});
// ================== API ==================
// status
app.get("/api/stats", requireLogin, async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(2);
    // CPU usage snapshot
    const cpus = os.cpus();
    const cpuLoad =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return acc + (1 - cpu.times.idle / total);
      }, 0) / cpus.length;
    const cpuUsage = (cpuLoad * 100).toFixed(2);
    // Disk usage using `df` command
    exec("df -h --output=pcent,target | grep '^'", (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: "Disk check failed" });
      }

      const lines = stdout
        .trim()
        .split("\n")
        .map((line) => line.trim());
      const disk = lines.map((line) => {
        const [used, mount] = line.split(/\s+/);
        return { mount, used };
      });

      res.json({
        memory: {
          total: (totalMem / 1024 / 1024).toFixed(0) + " MB",
          used: (usedMem / 1024 / 1024).toFixed(0) + " MB",
          usagePercent: memUsage + "%",
        },
        cpu: {
          usagePercent: cpuUsage + "%",
        },
        disk,
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Get Process
app.get("/api/processes", (req, res) => {
  const { exec } = require("child_process");
  // Get top 20 processes
  exec(
    "ps -eo pid,comm,%cpu,%mem,lstart --sort=-%cpu | head -n 20",
    (err, stdout) => {
      if (err) return res.status(500).send("Error getting processes");
      const lines = stdout.trim().split("\n").slice(1);
      const processes = lines.map((line) => {
        const parts = line.trim().split(/\s+/, 6);
        return {
          pid: parts[0],
          command: parts[1],
          cpu: parts[2],
          mem: parts[3],
          start: parts.slice(4).join(" "),
        };
      });
      res.json(processes);
    }
  );
});

// Get PM2 processes
app.get("/api/pm2", (req, res) => {
  exec("pm2 jlist", (err, stdout) => {
    if (err)
      return res.status(500).json({ error: "Failed to get PM2 processes" });

    try {
      const list = JSON.parse(stdout).map((app) => ({
        name: app.name,
        pid: app.pid,
        status: app.pm2_env.status,
        cpu: app.monit.cpu + "%",
        memory: (app.monit.memory / 1024 / 1024).toFixed(1) + " MB",
      }));

      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed to parse PM2 list" });
    }
  });
});

// Restart a specific PM2 process
app.post("/api/pm2/restart/:name", (req, res) => {
  const name = req.params.name;
  exec(`pm2 restart ${name}`, (err) => {
    if (err)
      return res.status(500).json({ error: "Failed to restart process" });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
