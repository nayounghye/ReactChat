// const http = require("http"); // socket은 http모듈로 생성된 서버에서만 동작한다.
// const express = require("express");
// const app = express();
// const PORT = 8000;
// const server = http.createServer(app); // socket은 http를 써야하고 http를 app객체를 연결해줘야 한다.

// const io = require("socket.io")(server);

// app.set("view engine", "ejs");

// app.get("/", function (req, res) {
//   res.render("client");
// });

// // 클라이언트로부터 connection를 받을 수 있는 이벤트 등록
// io.on("connection", (socket) => {
//   console.log("socket.id : ", socket.id);
// });

// // 소켓을 사용하려면 app.listen -> server.listen으로 변경해줘야 함.
// server.listen(PORT, function () {
//   console.log(`Sever Open: ${PORT}`);
// });

// -------- 리액트를 사용할 때 쓰는 server 기본틀 --------
// const http = require("http");
// const express = require("express");
// const app = express();
// const PORT = 8000;
// const server = http.createServer(app);

// const io = require("socket.io")(server);

// io.on("connection", (socket) => {

// });

// server.listen(PORT, function () {
//   console.log(`Sever Open: ${PORT}`);
// });
// -------- 리액트를 사용할 때 쓰는 server 기본틀 끝 --------

const http = require('http');
const express = require('express');
const app = express();
// 소켓이 http모듈로 생성된 서버에서만 동작
const server = http.createServer(app);
const PORT = 8000;

// cors 이슈 : 다른 서버에서 보내는 요청을 제한하는 이슈. -> 클라이언트서버와 백엔드서버를 따로 둘 때 문제가 발생함!
// 아래는 cors 모듈 불러오고 사용한다는 코드이다
const cors = require('cors');
app.use(cors());

// 다른서버에서 오는 요청은 보안상 이유로 디폴트로 막는데, 이 서버는 안전해!라는 걸 내가 알려줘야함!
// cors 모듈을 사용해야 함!
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    // 나중에 get/post 요청들도 이런식으로 다 적어줘야함. 코드는 인터넷 찾아볼것!
  },
});

const userIdArr = {};
// { key : value }형태로 저장이 된다 -> {"socket.id": "user.id"}
// {"socket.id": "user.id"}

// 실습 5 : DM기능을 위한 현재 채팅방 인원
const updateUserList = () => {
  io.emit('userList', userIdArr);
};

io.on('connection', (socket) => {
  console.log('socket id : ', socket.id);
  //   실습 3 : socket id를 이용해 입장 공지
  // io.emit("notice", { msg: `${socket.id}님이 입장하셨습니다.` });

  // 실습 3-3 : 퇴장시키기 -> 누가 입장하고 있는지 알아야 하고, 해당 정보를 전체적으로 저장할 필요가 있어 아래 코드 작성.
  // userIdArr[socket.id] = res.userId;

  // 실습 3-1 : 입장 시에 받은 user id로 입장 공지
  socket.on('entry', (res) => {
    // 실습 3-2 : 퇴장시키기
    // 닉네임 중복 여부에 따라 정상적으로 notice를 하든지, 닉네임 중복 오류 메시지를 보내든지 해야 한다.
    // Object.values(userIdArr) =>  ["userIda", "userIdb", "userIdc"]
    // includes : 문자열이나 배열에서 인자로 넘겨준 값이 존재하는지 안하는지 찾을 수 있음!
    // indexOf : 배열에서 인자로 넘겨준 값의 인덱스를 추출, 없다면 -1 을 반환하는 함수이다.

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

    // - 이 들어간 요소를 점접근법으로 작성하는 방법 : [] 에 담는다!
    // const obj = {abc: "aaa". "cd-e" : "bbb"};
    // obj.abc;
    //obj["cd-e"] // '-'같은 기호가 들어있으면 대괄호로 담아서 적어야한다.

    //   실습 3-3 : 퇴장 시키기
    socket.on('disconnect', () => {
      io.emit('notice', { msg: `${userIdArr[socket.id]}님이 퇴장하셨습니다.` });
      delete userIdArr[socket.id];
      console.log(userIdArr);
      updateUserList();
    });
  });

  const messageTime = new Date().toISOString(); // 채팅입력 시 시간 생성

  // 실습 4 : 채팅창 메시지 전송
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

server.listen(PORT, function () {
  console.log(`Sever Open: ${PORT}`);
});
