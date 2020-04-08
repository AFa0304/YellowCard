const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

let onlineCount = 0 //線上人數統計
app.use('/assets', express.static('assets'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

io.on('connection', (socket) => {
    onlineCount++
    io.emit("online", onlineCount)

    socket.on("connectEvent", () => {
        socket.emit("connectEvent", onlineCount)
    })
    socket.on("send", (msg) => {
        io.emit("msg", msg);
    })
    socket.on('disconnect', () => {
        // 有人離線了，扣人
        onlineCount = (onlineCount < 0) ? 0 : onlineCount -= 1;
        io.emit("online", onlineCount);
    })
})

server.listen(4567, () => {
    console.log("Server Started. http://localhost:4567");
});