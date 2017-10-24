const express = require('express');
const socket = require('socket.io');
const http = require('http');
const path = require('path');
const app = express();

let server = http.createServer(app).listen(7777);
let io = socket.listen(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './public/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index');
})

io.on('connection', function (socket) {
    socket.on('gigaginie', function (msg) {
        switch (JSON.parse(msg).eventOp) {
            case 'DrawStart':
            io.emit('gigaginie', msg);
            break;

            case 'DrawMove':
            io.emit('gigaginie', msg);
            break;
            
            case 'DrawEnd':
            io.emit('gigaginie', msg);
            break;
        }
    })

})