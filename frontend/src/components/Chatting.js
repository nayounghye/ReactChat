import "../style/chat.css";
import { useCallback, useEffect, useState, useMemo } from "react";
import io from "socket.io-client";

const socket = io.connect("htt://localhost:8000", { autoConnect: false });
export default function Chatting() {
  return <></>;
}
