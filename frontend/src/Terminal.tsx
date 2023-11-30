import React, { useCallback, useEffect, useRef, useState } from "react";

import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import { FitAddon } from "xterm-addon-fit";

const specialCommands = {
  "yagna payment onboard": () => {
    return "Not implemented yet, waiting for url from Kaja";
  },
};

export const TerminalComponent = () => {
  // Persisting the terminal instance between renders
  const xtermRef = useRef(
    new Terminal({
      fontSize: 16,
      cursorBlink: true,
      cursorStyle: "underline",
      theme: {
        foreground: "#fff",
      },
    })
  );

  const [history, setHistory] = useState<string[]>([]);

  const stopListening = useRef({
    dispose: () => {},
  });

  const index = useRef(0);
  const socket = useRef(new WebSocket(import.meta.env.VITE_WS_URL as string));
  const [command, setCommand] = useState("");

  const prompt = useCallback(() => {
    const term = xtermRef.current;
    term.write("\r\n$ ");
    setCommand("");
  }, [xtermRef]);

  const runCommand = useCallback(() => {
    if (command.length > 0) {
      setHistory((prev) => [...prev, command]);
      index.current = history.length + 1;
      if (specialCommands[command as keyof typeof specialCommands]) {
        const result =
          specialCommands[command as keyof typeof specialCommands]();
        xtermRef.current.writeln("\r\n");
        //todo add methods for errors and warnings
        xtermRef.current.writeln("\x1b[1;31m" + result + "\x1b[0m");
        prompt();
        return;
      }
      socket.current.send(command);
      return;
    }
  }, [command, history]);

  const onKey = useCallback(
    (e: { key: string; domEvent: KeyboardEvent }) => {
      const term = xtermRef.current;
      const key = e.key;
      switch (key) {
        case "\u001b[A": //  "ArrowUp":
          if (index.current > 0) {
            index.current--;
            const historyCommand = history[index.current];
            if (historyCommand) {
              setCommand(historyCommand);
              term.write("\b \b".repeat(command.length));
              term.write(historyCommand);
            }
          }
          break;
        case "\u001b[B": //  "ArrowDown":
          if (index.current < history.length) {
            index.current++;
            const historyCommand = history[index.current];
            if (historyCommand) {
              setCommand(historyCommand);
              term.write("\b \b".repeat(command.length));
              term.write(historyCommand);
            }
          }
          break;
        case "\u0003": // Ctrl+C
          term.write("^C");
          prompt();
          break;
        case "\r": // Enter
          runCommand();
          break;

        case "\u007F": // Backspace (DEL)
          console.log("backspace");
          // Do not delete the prompt

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          if (term._core.buffer.x > 2) {
            term.write("\b \b");
            if (command.length > 0) {
              // command = command.substr(0, command.length - 1);
              setCommand((prev) => prev.substr(0, prev.length - 1));
            }
          }
          break;

        default:
          if (
            (key >= String.fromCharCode(0x20) &&
              key <= String.fromCharCode(0x7e)) ||
            key >= "\u00a0"
          ) {
            setCommand((prev) => prev + key);
            term.write(key);
          }
      }
    },
    [command, history, prompt, runCommand]
  );

  const isOpened = React.useRef(false);

  useEffect(() => {
    const term = xtermRef.current;
    if (isOpened.current) {
      return;
    }
    term.open(document.getElementById("terminal")!);
    term.writeln("Welcome to Yagna Terminal");
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();

    prompt();
    socket.current.onmessage = (event) => {
      term.writeln("");
      event.data.split("\n").forEach((line: string) => {
        term.writeln(line);
      });
      prompt();
    };
    return () => {
      isOpened.current = true;
    };
  }, []);

  //xterm keeps array of listeners, so we need to dispose previous one
  //and add new one on each onKey change to work well with hooks data flow

  useEffect(() => {
    const term = xtermRef.current;
    stopListening.current.dispose();
    stopListening.current = term.onKey(onKey);
  }, [onKey]);

  return (
    <>
      <div id="terminal" className="terminal"></div>
    </>
  );
};
