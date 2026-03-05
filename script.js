const API = "https://api.mcsrvstat.us/2/frp-nut.com:44691"; // 请替换为实际地址或使用代理
let chart;

// 获取完整时间格式（用于时间轴显示）
function getFullTime() {
    const now = new Date();
    return now.getFullYear() + "-" + 
           String(now.getMonth() + 1).padStart(2, '0') + "-" + 
           String(now.getDate()).padStart(2, '0') + " " + 
           String(now.getHours()).padStart(2, '0') + ":" + 
           String(now.getMinutes()).padStart(2, '0') + ":" + 
           String(now.getSeconds()).padStart(2, '0');
}

// 获取短时间格式（用于图表X轴显示）
function getShortTime() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ":" + 
           String(now.getMinutes()).padStart(2, '0') + ":" + 
           String(now.getSeconds()).padStart(2, '0');
}

async function updateServer() {
    try {
        const res = await fetch(API);
        const data = await res.json();
        const online = data.online;
        const players = data.players?.online ?? 0;

        document.getElementById("serverStatus").innerText = online ? "🟢 在线" : "🔴 离线";
        document.getElementById("serverStatus").className = online ? "online" : "offline";
        document.getElementById("playerCount").innerText = players;

        renderPlayers(data.players?.list ?? []);

        // 每次刷新都记录当前实时时间
        saveHistory(players);
    } catch (e) {
        console.error(e);
        document.getElementById("serverStatus").innerText = "⚠️ 检测失败";
        document.getElementById("playerCount").innerText = "-";
    }
}

function renderPlayers(list) {
    const ul = document.getElementById("players");
    ul.innerHTML = "";
    if (list.length === 0) {
        ul.innerHTML = "<li>暂无玩家在线</li>";
        return;
    }
    list.forEach(p => {
        const li = document.createElement("li");
        li.innerText = p;
        ul.appendChild(li);
    });
}

function saveHistory(players) {
    let history = JSON.parse(localStorage.getItem("mc_history") || "[]");

    const fullTime = getFullTime();   // 2026-03-05 14:30:45
    const shortTime = getShortTime(); // 14:30:45
    const now = Date.now();

    // 添加新记录（每次刷新都添加）
    history.push({ 
        fullTime: fullTime,      // 时间轴显示用
        shortTime: shortTime,    // 图表X轴显示用
        players: players,
        timestamp: now           // 用于清理旧数据
    });

    // 方案3：保留最近100条且不超过7天的数据
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // 先过滤掉7天前的数据
    history = history.filter(h => h.timestamp > sevenDaysAgo);

    // 如果还是超过100条，只保留最近的100条
    if (history.length > 100) {
        history = history.slice(-100);
    }

    localStorage.setItem("mc_history", JSON.stringify(history));
    render();
}

function render() {
    const history = JSON.parse(localStorage.getItem("mc_history") || "[]");

    // 图表使用短时间格式（时分秒）
    const labels = history.map(h => h.shortTime);
    const values = history.map(h => h.players);

    if (chart) chart.destroy();

    chart = new Chart(document.getElementById("chart"), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "在线人数",
                data: values,
                fill: true,
                backgroundColor: "rgba(77, 166, 255, 0.1)",
                borderColor: "#4da6ff",
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#4da6ff",
                pointBorderColor: "#fff",
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        // 悬停时显示完整时间
                        title: function(context) {
                            const index = context[0].dataIndex;
                            return history[index].fullTime;
                        }
                    }
                }
            },
            scales: { 
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                }
            }
        }
    });

    // 时间轴使用完整时间格式（年月日 时分秒）
    const list = document.getElementById("timeline");
    list.innerHTML = "";
    history.slice().reverse().forEach(h => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="time">${h.fullTime}</span> <span class="count">${h.players} 人在线</span>`;
        list.appendChild(li);
    });
}

// 初始化
updateServer();
render();

// 可选：每5分钟自动刷新一次
// setInterval(updateServer, 300000);
