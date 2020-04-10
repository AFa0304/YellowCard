const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

let users = [] //目前登入玩家

app.use('/assets', express.static('assets'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});
app.get('/login/:userName', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});
app.get('/getUserInfo', (req, res) => {
    let userData = null
    const userID = req.query.id
    findUserByID(userID, function (index) {
        userData = users[index]
    })
    if (userData) {
        res.send(userData)
    } else {
        res.status(400).send("登入失敗,請重新登入")
    }
})

io.on('connection', (socket) => {
    const guid = socket.id
    let userName = ""

    /* 開始頁 */
    socket.on("login", (userName) => { //登入事件
        users.push({
            ID: guid,
            userName: userName,
            ready: false
        })
        socket.emit("loginSuccess", true, guid)
        console.log("玩家 " + userName + " 登入 ID:" + guid)
    })
    /* Lobby頁 */
    socket.on("successLoginLobby", (userID) => {
        socket.join("room1")
        socket.room = "room1"
        socket.id = userID
        findUserByID(userID, function (index) {
            userName = users[index].userName
        })
        console.log("玩家 "+ userName + " 加入大廳")
    })

    socket.on("refreshPlayerList", () => { //刷新線上名單
        io.emit("refreshPlayerList", users)
    })

    socket.on("readyPlay", (userID) => { //按下準備紐
        let isAllReady = true
        findUserByID(userID, function (index) {
            users[index].ready = true
            io.emit("refreshPlayerList", users)
        })
        users.map(user => {
            if (user.ready === false) {
                isAllReady = false
            }
        })
        if (isAllReady) {
            let sec = 5
            const countdown = setInterval(() => {
                console.log(sec + "...")
                sec -= 1
                if (sec === 0) {
                    clearInterval(countdown)
                    console.log("game start")
                }
            }, 1000)
            console.log("遊戲將在五秒後開始...")
        }
    })
    /* 離開連線 */
    socket.on('disconnect', () => {
        if (socket.room) { // 在大廳
            if (socket.id) {
                findUserByID(socket.id, function (index) {
                    console.log("玩家 " + users[index].userName + " 離開了大廳")
                    users.splice(index, 1)
                    io.emit("refreshPlayerList", users)
                })
            }
        }
    })
})
function findUserByID(userID, callBack) {
    users.map((user, index) => {
        if (user.ID === userID) {
            callBack(index)
        }
    })
}


server.listen(4567, () => {
    console.log("Server Started. http://localhost:4567");
});