import { WebSocketServer } from "ws";
import { exec } from "child_process";
const wss = new WebSocketServer({ port: 3010 });
wss.on("connection", function connection(ws) {
  ws.on("message", function message(data) {
    console.log("Received:", data.toString());
    const badCommands = [
      "rm",
      "sudo",
      "shutdown",
      "halt",
      "reboot",
      "poweroff",
      "mv",
      ": () { :|: & }",
    ];
    for (const command of badCommands) {
      if (data.toString().indexOf(command) > -1) {
        return ws.send("Nope my dear!");
      }
    }
    exec(data.toString(), (_error, stdout, stderr) => {
      console.log("Stdout:", stdout);
      console.log("Stderr:", stderr);
      ws.send(stdout || stderr);
    });
  });
});
