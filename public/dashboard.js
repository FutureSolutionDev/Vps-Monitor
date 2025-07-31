let TabId = null;
document.addEventListener("DOMContentLoaded", function () {
  window.restartPM2 = function (name) {
    fetch(`/api/pm2/restart/${name}`, { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        alert(`Process '${name}' restarted`);
        location.reload();
      })
      .catch(() => alert("Failed to restart process"));
  };

  window.filterProcesses = function (processes) {
    const excluded = [
      "xrdp",
      "xrdp-sesman",
      "mariadbd",
      "sshd",
      "systemd",
      "rsyslogd",
      "dbus-daemon",
      "polkitd",
      "NetworkManager",
      "accounts-daemon",
      "jbd2/",
      "rcu_preempt",
      "kworker/",
      "xfconfd",
      "tumblerd",
      "ps",
      "PM2",
      "mousepad",
      "Xorg",
    ];
    return processes.filter(
      (proc) => proc.command && !excluded.some((e) => proc.command.includes(e))
    );
  };

  window.showTab = function (tabId) {
    TabId = tabId;
    const Funcs = {
      stats: StartStatus,
      pm2: StartPm2,
      processes: StartProcesses,
    };
    if (Funcs[tabId]) Funcs[tabId]();

    document
      .querySelectorAll(".tab-content")
      .forEach((el) => el.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");
  };

  function StartStatus() {
    if (TabId !== "stats") return;
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        renderSystemUsage(data);
        setTimeout(StartStatus, 5000);
      });
  }

  function StartPm2() {
    fetch("/api/pm2")
      .then((res) => res.json())
      .then((apps) => renderPM2Apps(apps));
  }

  function StartProcesses() {
    fetch("/api/processes")
      .then((res) => res.json())
      .then((procs) => renderSystemProcesses(filterProcesses(procs)));
  }
  window.StartStatus = StartStatus;
  window.StartProcesses = StartProcesses;
  window.StartPm2 = StartPm2;


  function renderSystemUsage(data) {
    renderMemory(data.memory);
    renderCpu(data.cpu);
    renderDiskUsage(data.disk);
  }

  function renderMemory(memory) {
    document.getElementById("memory").innerHTML = `
        <h3 class="text-md font-semibold mb-2"> 🧠 Memory Usage:</h3>
        <div class="bg-gray-800 p-3 rounded shadow text-sm">
          <p> 🟢 Total: ${memory.total}</p>
          <p> 🔴 Used: ${memory.used}</p>
          <p> 🟣 Usage: ${memory.usagePercent}</p>
        </div>
      `;
  }

  function renderCpu(cpu) {
    document.getElementById("cpu").innerHTML = `
        <h3 class="text-md font-semibold mb-2">🖥️ CPU Usage:</h3>
        <div class="bg-gray-800 p-3 rounded shadow text-sm">
          <p>Usage: ${cpu.usagePercent}</p>
        </div>
      `;
  }

  function renderDiskUsage(diskData) {
    const diskDiv = document.getElementById("disk");
    const filtered = diskData.slice(1);

    const tableRows = filtered
      .map(
        (d) => `
        <tr>
          <td class="border-b border-gray-700 py-1 px-2">${d.mount}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-right">${d.used}</td>
        </tr>
      `
      )
      .join("");

    diskDiv.innerHTML = `
        <h3 class="text-md font-semibold mb-2">💾 Disk Usage:</h3>
        <table class="w-full text-left border-collapse bg-gray-800 rounded text-sm">
          <thead>
            <tr class="bg-gray-700 text-gray-300">
              <th class="py-1 px-2">Mount</th>
              <th class="py-1 px-2 text-center">Usage</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
  }

  function renderPM2Apps(apps) {
    const pm2Div = document.getElementById("pm2");
    if (!apps || !apps.length) return;

    const tableRows = apps
      .map(
        (app) => `
        <tr>
          <td class="border-b border-gray-700 py-1 px-2 text-center">${app.name}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-center">${app.pid}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-center">${app.status}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-center">${app.cpu}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-center">${app.memory}</td>
          <td class="border-b border-gray-700 py-1 px-2 text-center">
            <button onclick="restartPM2('${app.name}')" class="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs">Restart</button>
          </td>
        </tr>
      `
      )
      .join("");

    pm2Div.innerHTML = `
      <div
        class="bg-gray-800 p-3 rounded shadow text-sm flex items-center justify-between"
       >
        <h3 class="text-md font-semibold mb-2">🚀 PM2 Processes:</h3>
        <button onclick="StartPm2()" class="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs">Refresh</button>
       </div>
        <table class="w-full text-left border-collapse bg-gray-800 rounded text-sm">
          <thead>
            <tr class="bg-gray-700 text-gray-300">
              <th class="py-1 px-2 text-center" >Name</th>
              <th class="py-1 px-2 text-center">PID</th>
              <th class="py-1 px-2 text-center">Status</th>
              <th class="py-1 px-2 text-center">CPU</th>
              <th class="py-1 px-2 text-center">Memory</th>
              <th class="py-1 px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      `;
  }

  function renderSystemProcesses(processes) {
    const container = document.getElementById("processes");
    container.innerHTML = `
       <div
        class="bg-gray-800 p-3 rounded shadow text-sm flex items-center justify-between"
       >
        <h3 class="text-md font-semibold mb-2">🚀 Running Processes:</h3>
        <button onclick="StartProcesses()" class="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs">Refresh</button>
       </div>
        <table class="w-full text-left border-collapse bg-gray-800 rounded text-sm">
          <thead>
            <tr class="bg-gray-700 text-gray-300">
              <th class="py-1 px-2 text-center">PID</th>
              <th class="py-1 px-2 text-center">Command</th>
              <th class="py-1 px-2 text-center">CPU%</th>
              <th class="py-1 px-2 text-center">Mem%</th>
            </tr>
          </thead>
          <tbody>
            ${processes
              .map(
                (p) => `
              <tr>
                <td class="border-b border-gray-700 py-1 px-2 text-center">${p.pid}</td>
                <td class="border-b border-gray-700 py-1 px-2 text-center truncate">${p.command}</td>
                <td class="border-b border-gray-700 py-1 px-2 text-center">${p.cpu}</td>
                <td class="border-b border-gray-700 py-1 px-2 text-center">${p.mem}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
  }

  showTab("stats");
});
