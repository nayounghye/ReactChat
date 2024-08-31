const http = require('http'); // socket은 http모듈로 생성된 서버에서만 동작한다.
const express = require('express');
const app = express();
const PORT = 8000;
const server = http.createServer(app); // socket은 http를 써야하고 http를 app객체를 연결해줘야 한다.
const cors = require('cors');
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000', // 허용할 클라이언트 주소
    methods: ['GET', 'POST'],
    credentials: true, // 쿠키 등을 주고받을 수 있도록 설정
  },
});
const corsOptions = {
  origin: 'http://localhost:3000', // 클라이언트 주소를 명시
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};
const userIdArr = {};
// { key : value }형태로 저장이 된다 -> {"socket.id": "user.id"}
// {"socket.id": "user.id"}

// DM기능을 위한 현재 채팅방 리스트!
const updateUserList = () => {
  io.emit('userList', userIdArr);
};

app.set('view engine', 'ejs');
app.use(cors(corsOptions));
app.use(express.static('public'));
app.get('/', function (req, res) {
  res.render('client');
});

// 클라이언트로부터 connection를 받을 수 있는 이벤트 등록
io.on('connection', (socket) => {
  console.log('socket.id : ', socket.id);

  // 서버에서 io객체를 사용하면 클라이언트들 전체를 대상으로 하는 것!
  socket.on('entry', (res) => {
    console.log('entry : ', res);
    // 닉네임을 등록 후 클라이언트로 성공 메세지를 보냄
    socket.emit('entrySuccess', { userId: res.userId });
    // 전체 클라이언트를 대상으로 데이터를 보낼 땐 io.emit 사용
    // io.emit('notice', { msg: `${socket.id}님이 입장했습니다.` });
    if (Object.values(userIdArr).includes(res.userId)) {
      // 닉네임이 중복될 경우
      socket.emit('error', { msg: '중복된 ID가 존재하여 입장이 불가합니다.' });
    } else {
      // 중복되지 않을 경우에
      io.emit('notice', { msg: `${res.userId}님이 입장하셨습니다.` });
      socket.emit('entrySuccess', { userId: res.userId });
      userIdArr[socket.id] = res.userId;
      updateUserList();
    }
    console.log(userIdArr);
    // 퇴장 메시지
    socket.on('disconnect', () => {
      const userId = userIdArr[socket.id];
      if (userId) {
        io.emit('notice', {
          msg: `${userIdArr[socket.id]}님이 퇴장하셨습니다.`,
        });
        delete userIdArr[socket.id];
        // console.log(userIdArr);
        updateUserList();
      }
    });
  });

  // 채팅창 메시지 전송
  socket.on('sendMsg', (res) => {
    if (res.dm === 'all')
      io.emit('chat', { userId: res.userId, msg: res.msg, time: messageTime });
    else {
      // io.to(소켓아이디).emit() 로 사용이 가능 : 선택한 소켓아이디에게만 전달
      io.to(res.dm).emit('chat', {
        userId: res.userId,
        msg: res.msg,
        dm: true,
        time: messageTime,
      });
      socket.emit('chat', {
        userId: res.userId,
        msg: res.msg,
        dm: true,
        time: messageTime,
      });
    }
  });

  socket.on('startTyping', (userId) => {
    socket.broadcast.emit('userTyping', { userId, typing: true });
  });

  socket.on('stopTyping', (userId) => {
    socket.broadcast.emit('userTyping', { userId, typing: false });
  });
});

const messageTime = new Date().toISOString(); // 채팅입력 시 시간 생성

// 소켓을 사용하려면 app.listen -> server.listen으로 변경해줘야 함.
server.listen(PORT, function () {
  console.log(`Sever Open: ${PORT}`);
});
