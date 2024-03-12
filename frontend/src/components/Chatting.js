import '../styles/chat.css';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import Chat from './Chat';
import Notice from './Notice';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:8000', { autoConnect: false });
export default function Chatting3() {
  const [msgInput, setMsgInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [chatList, setChatList] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userList, setUserList] = useState({});
  const [dmTo, setDmTo] = useState('all');
  const [typingUserID, setTypingUserID] = useState(null);

  const initSocketConnect = () => {
    console.log('connected', socket.connected);
    if (!socket.connected) socket.connect();
  };

  // 입력 필드에 대한 참조 생성
  const userIdInputRef = useRef(null);
  const msgInputRef = useRef(null);

  // 닉네임 입력창 포커스
  useEffect(() => {
    if (userIdInputRef.current) {
      userIdInputRef.current.focus();
    }
  }, []);

  // 채팅 입력창 포커스
  useEffect(() => {
    if (userId && msgInputRef.current) {
      msgInputRef.current.focus();
    }
  }, [userId]);

  useEffect(() => {
    socket.on('error', (res) => {
      alert(res.msg);
    });

    socket.on('entrySuccess', (res) => {
      setUserId(res.userId);
    });

    socket.on('userList', (res) => {
      setUserList(res);
    });
  }, []);

  // useMemo : 값을 메모라이징 한다.
  // 뒤에 있는 의존성 배열에 있는 값이 업데이트될 때마다 연산을 실행함.
  const userListOptions = useMemo(() => {
    // [<option></option>,<option></option>]
    // key of : 배열을 검색
    // key in : 객체를 검색
    const options = [];
    for (const key in userList) {
      // key : userList의 key값 (=socket id)
      // userList[key] : userList의 value값 (=유저 id)
      if (userList[key] === userId) continue;
      options.push(
        <option key={key} value={key}>
          {userList[key]}
        </option>
      );
    }
    return options;
  }, [userList]);
  // useCallback: 함수를 메모라이징 한다.
  // 뒤에 있는 의존성 배열에 있는 값이 update 될 때만 함수를 다시 선언함.
  const addChatList = useCallback(
    (res) => {
      const type = res.userId === userId ? 'my' : 'other';
      const content = `${res.dm ? '(속닥속닥)' : ''} ${res.msg}`;
      const newChatList = [
        ...chatList,
        { type: type, userId: res.userId, content: content, time: res.time },
      ];
      setChatList(newChatList);
    },
    [userId, chatList]
  );

  useEffect(() => {
    socket.on('chat', addChatList);
    return () => socket.off('chat', addChatList);
  }, [addChatList]);

  useEffect(() => {
    const notice = (res) => {
      const newChatList = [...chatList, { type: 'notice', content: res.msg }];
      setChatList(newChatList);
    };

    socket.on('notice', notice);
    return () => socket.off('notice', notice);
  }, [chatList]);

  const sendMsg = () => {
    if (msgInput !== '') {
      socket.emit('sendMsg', { userId: userId, msg: msgInput, dm: dmTo });
      setMsgInput('');
    }
  };

  const entryChat = () => {
    initSocketConnect();
    socket.emit('entry', { userId: userIdInput });
  };

  // 채팅 목록을 변환하고 isFirstOfType 속성을 추가
  const enhancedChatList = chatList.reduce((acc, chat, i, arr) => {
    let isFirst = i === 0 || arr[i - 1].type !== chat.type;
    let isLast = i === arr.length - 1 || arr[i + 1].type !== chat.type;
    acc.push({
      ...chat,
      isFirst,
      isLast,
    });

    if (chat.type === 'other') {
      if (i === 0 || (i > 0 && arr[i - 1].type !== 'other')) {
        isFirst = true;
      }
    }

    return acc;
  }, []);

  // 채팅에 따른 스크롤바 참조 생성
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // 채팅 목록이 변경될 때마다 호출
    if (chatContainerRef.current) {
      const scrollHeight = chatContainerRef.current.scrollHeight;
      chatContainerRef.current.scrollTo(0, scrollHeight);
    }
  }, [chatList]); // chatList가 변경될 때마다 useEffect 실행!

  return (
    <>
      {userId ? (
        <>
          <div className="chat-container" ref={chatContainerRef}>
            {enhancedChatList.map((chat, i) => {
              // 여기에서 isFirstOfType을 chat 객체에서 추출
              return chat.type === 'notice' ? (
                <Notice key={i} chat={chat} />
              ) : (
                <Chat
                  key={i}
                  chat={chat}
                  isFirst={chat.isFirst}
                  isLast={chat.isLast}
                  userId={chat.userId}
                />
              );
            })}
          </div>
          <div className="input-container chat">
            <div className="send-container">
              <select value={dmTo} onChange={(e) => setDmTo(e.target.value)}>
                <option value="all">전체</option>
                {userListOptions}
                <option></option>
              </select>
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && sendMsg()}
                ref={msgInputRef}
                placeholder="채팅을 입력하세요."
              />

              <button type="button" onClick={sendMsg}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-send"
                  viewBox="0 0 16 16"
                >
                  <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="input-container name">
            <input
              type="text"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && entryChat()}
              ref={userIdInputRef}
              placeholder="닉네임을 입력하세요."
            />
            <button onClick={entryChat}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                class="bi bi-arrow-up-circle-fill"
                viewBox="0 0 16 16"
              >
                <path d="M16 8A8 8 0 1 0 0 8a8 8 0 0 0 16 0zm-7.5 3.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708l3-3a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V11.5z" />
              </svg>
            </button>
          </div>
        </>
      )}
    </>
  );
}
