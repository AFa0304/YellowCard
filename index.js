/* ↓ Heroku ↓ */
const port = process.env.PORT || 4567 //git push heroku master
/* ↑ Heroku ↑ */
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

let users = [] //目前登入玩家

app.use('/assets', express.static('assets'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});
app.get('/lobby/:userName', (req, res) => {
    res.sendFile(__dirname + '/views/lobby.html');
});
app.get('/game/:userName', (req, res) => {
    res.sendFile(__dirname + '/views/game.html');
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

    /* 開始頁 */
    socket.on("login", (userName) => { // 登入事件
        users.push({
            ID: guid,
            userName: userName,
            ready: false,
            isConnecting: false
        })
        socket.emit("loginSuccess", true, guid)
        console.log("玩家 " + userName + " 登入 ID:" + guid)
    })
    /* Lobby頁 */
    socket.on("successLoginLobby", (userID) => {
        let userIndex = undefined
        socket.join("room1")
        socket.room = "room1"
        findUserByID(userID, function (index) {
            userIndex = index
        })
        if (users[userIndex].isConnecting === true) {
            socket.emit("alertAndBackToHome", "重複的連線,請重新登入")
        } else {
            socket.id = userID
            users[userIndex].isConnecting = true
            io.emit("getSystemMsg", "玩家 <strong>" + users[userIndex].userName + "</strong> 加入大廳")
        }
    })

    socket.on("refreshPlayerList", () => { // 刷新線上名單
        io.emit("refreshPlayerList", users)
    })

    socket.on("toggleReady", (userID) => { // 按下準備紐
        let isAllReady = true
        let notReadyUsers = []
        findUserByID(userID, function (index) {
            users[index].ready = !users[index].ready
            io.emit("refreshPlayerList", users)
            if (users[index].ready === true) {
                io.emit("getSystemMsg", "<strong>" + users[index].userName + "</strong> 已經準備好了")
            } else {
                io.emit("getSystemMsg", "<strong>" + users[index].userName + "</strong> 取消了準備")
            }
        })
        users.map((user, index) => {
            if (user.ready === false) {
                isAllReady = false
                notReadyUsers.push(user.userName)
            }
            if (!user.isConnecting) { // 踢除大廳內未連線使用者
                kickOutUser(index)
            }
        })
        if (isAllReady && users.length > 1) {
            let sec = 5
            const countdown = setInterval(() => {
                io.emit("getSystemMsg", "遊戲將在<strong>" + sec + "</strong>秒後開始...")
                sec -= 1
                users.map((user) => {
                    if (user.ready === false) { // 若有人中途取消準備
                        clearInterval(countdown)
                        io.emit("getSystemMsg", "<strong>" + user.userName + "</strong> 取消了準備，暫停倒數")
                    } else {
                        if (sec === 0) {
                            clearInterval(countdown)
                            io.emit("getSystemMsg", "遊戲開始")
                            io.emit("gameStart")
                        }
                    }
                })
            }, 1000)
        } else {
            if (users.length !== 1) io.emit("getSystemMsg", "剩 <strong>" + notReadyUsers.join(",") + "</strong> 還沒按開始，大家快催他" + (notReadyUsers.length > 1 ? "們" : ""))
        }
    })
    /* 遊戲頁 */
    
    /* 離開連線 */
    socket.on('disconnect', () => {
        if (socket.room) { // 在大廳
            if (socket.id) {
                findUserByID(socket.id, function (index) {
                    kickOutUser(index)
                })
            }
        }
    })
    function kickOutUser(UserIndex) { // 踢掉使用者
        io.emit("getSystemMsg", "玩家 <strong>" + users[UserIndex].userName + "</strong> 離開了大廳")
        users.splice(UserIndex, 1)
        io.emit("refreshPlayerList", users)
    }
})
function findUserByID(userID, callBack) {
    users.map((user, index) => {
        if (user.ID === userID) {
            callBack(index)
        }
    })
}

server.listen(port, () => console.log(`伺服器啟動，PORT:${port}`));