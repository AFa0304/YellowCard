const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

let onlineCount = 0 //線上人數統計
let users = [] //目前登入玩家

app.use('/assets', express.static('assets'))
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});
app.get('/login/:userName', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});
app.get('/getUserInfo', (req, res, next) => {
    let userData = null
    const userID = req.query.id
    users.map(user => {
        if (user.ID === userID) {
            userData = user
        }
    })
    if (userData) {
        res.send(userData)
    } else {
        res.status(400).send("登入失敗")
    }
})

io.on('connection', (socket) => {
    onlineCount++
    // io.emit("online", onlineCount) 向使用者丟封包

    //登入事件
    socket.on("login", (userName) => {
        let randomID = ""
        for (var i = 0; i <= 9; i++) {
            randomID += Math.floor(Math.random() * 10)
        }
        users.push({
            ID: randomID,
            userName: userName
        })
        io.emit("loginSuccess", true, randomID)
    })

    socket.on("getLobbyInfo", (userID) => {
        let datas = {
            userID: userID,
            players: users
        }
        users.map((user) => {
            if (user.ID === userID) {
                datas.userName = user.userName
                socket.userID = user.userID
                socket.userName = user.userName
            }
        })
        io.emit("getLobbyInfo", datas)
    })

    socket.on('disconnect', () => {
        if (socket.userName) {
            console.log("disconnect", socket.userName)
            users.map((user, index) => {
                if (user.userName === socket.userName) {
                    users.splice(index, 1)
                    socket.emit("getLobbyInfo", {
                        userID: socket.userID,
                        userName: socket.userName,
                        players: users
                    })
                }
                console.log(users)
            })
        }
    })
})


server.listen(4567, () => {
    console.log("Server Started. http://localhost:4567");
});