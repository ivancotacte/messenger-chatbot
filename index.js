const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const login = require("fca-unofficial");
const axios = require("axios");
const path = require("path");
const filipinoBadwords = require("filipino-badwords-list");


var prefix = config.prefix;
let badWordCount = {};
let vips = ["100050076673558"];
const welcomeGifDirectory = "./welcome_gifs"; 
const goodbyeGifDirectory = "./goodbye_gifs";

async function getUserName(api, userID) {
  return new Promise((resolve, reject) => {
    api.getUserInfo([userID], (err, userInfo) => {
      if (err) reject(err);
      const userName = userInfo[userID].name;
      resolve(userName);
    });
  });
}
function getRandomGifPath(directory) {
  const gifFiles = fs.readdirSync(directory);
  if (gifFiles.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * gifFiles.length);
  return path.join(directory, gifFiles[randomIndex]);
}
async function getGroupMembers(api, threadID) {
  return new Promise((resolve, reject) => {
    api.getThreadInfo(threadID, (err, threadInfo) => {
      if (err) reject(err);
      const members = threadInfo.participantIDs;
      resolve(members);
    });
  });
}

login(
  { appState: JSON.parse(fs.readFileSync("./session.json", "utf8")) },
  (err, api) => {
    if (err) return console.error(err);
    api.setOptions({
      forceLogin: true,
      listenEvents: true,
      logLevel: "silent",
      selfListen: false,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/95.0.4638.50 Mobile/15E148 Safari/604.1",
    });
    api.listenMqtt(async (err, event) => {
      if (err) return console.error(err);

      const { threadID, messageID, senderID, type, body } = event;

      switch (type) {
        case "message":
        case "message_reply":
          if (type === "message" || type === "message_reply") {
            ////// Sim //////
            if (body.startsWith(`${prefix}sim`) || body.startsWith(`${prefix}Sim`)) {
              let { threadID, messageID } = event;
              const response = body.substring(body.indexOf(" ") + 1); // Extract the message after the command
              if (!response) {
                api.sendMessage("Hi!", threadID, messageID);
                return;
              }
              try {
                const res = await axios.get(
                  `https://testapi.heckerman06.repl.co/api/other/simsimi?message=${encodeURIComponent(
                    response
                  )}&lang=ph`
                );
                const respond = res.data.message;
                api.sendMessage(respond, threadID, messageID);
              } catch (error) {
                api.sendMessage(
                  "Error occurred while fetching data from the Simsimi API.",
                  threadID,
                  messageID
                );
              }
            }
            ////// Pinterest //////
            if (body != null) {
              let chat = body.split(" ");
              chat.shift();
              const msg = chat.join(" ");
              if (
                body.startsWith(`${prefix}pinte`) ||
                body.startsWith(`${prefix}pinterest`)
              ) {
                if (!msg.includes("-")) {
                  api.sendMessage(
                    "Please enter in the format\nExample: pinterest Naruto - 10 (it depends on you how many images you want to appear in the result)",
                    threadID
                  );
                  return;
                }
                const keySearchs = msg.substr(0, msg.indexOf("-"));
                const numberSearch = msg.split("-").pop() || 6;
                const res = await axios.get(
                  `https://api-dien.kira1011.repl.co/pinterest?search=${encodeURIComponent(
                    keySearchs
                  )}`
                );
                const data = res.data.data;
                var num = 0;
                var imgData = [];
                for (var i = 0; i < parseInt(numberSearch); i++) {
                  let path = `${num += 1}.jpg`;
                  let getDown = (
                    await axios.get(`${data[i]}`, { responseType: "arraybuffer" })
                  ).data;
                  fs.writeFileSync(path, Buffer.from(getDown, "utf-8"));
                  imgData.push(fs.createReadStream(`${num}.jpg`));
                }
                api.sendMessage("🔍" + msg, threadID);
                api.sendMessage(
                  {
                    attachment: imgData,
                    body: "Showing " + numberSearch + " result for: " + keySearchs,
                  },
                  threadID
                );
                for (let ii = 1; ii < parseInt(numberSearch); ii++) {
                  fs.unlinkSync(`${ii}.jpg`);
                }
              }
            }
          }
          ///// BOT //////
          const currentDateTime = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
if (body.startsWith("bot") || body.startsWith("Bot")) {
  api.getUserInfo(event.senderID, (err, ret) => {
    if (!err) {
      const sender = ret[event.senderID];
      const senderName = sender.firstName;
      api.sendMessage(`@${senderName} I'm here, sir. Current date and time in the Philippines: ${currentDateTime}`, threadID, (err, messageInfo) => {
        if (!err && messageInfo) {
          const reaction = "👍";
          api.setMessageReaction(reaction, messageInfo.messageID);
        }
      });
    }
  });
}
          ////// HELP GUIDE //////
          if (body.startsWith("Help") || body.startsWith("help") || body.startsWith(`${prefix}help`) || body.startsWith(`${prefix}Help`)) {
            const helpMessage =
              "HELP GUIDE\nMy Prefix [ " + prefix + " ]\n\nCommands list:\nbard\nsim\npinterest";
            const gifPath = path.join(__dirname, "help.gif"); // Replace with the desired path and filename
          
            api.sendMessage(
              {
                body: helpMessage,
                attachment: fs.createReadStream(gifPath),
              },
              threadID
            );
          }
          ////// Bard //////
          if (
            body.startsWith(`${prefix}bard`) ||
            body.startsWith(`${prefix}Bard`)
          ) {
            const response = body.slice(5).trim();
            api.setMessageReaction("", messageID, (err) => {}, true);
            if (!response) {
              return api.sendMessage(
                `Hello! How may I assist you today?`,
                threadID,
                messageID
              );
            }
            try {
              const encodedResponse = encodeURIComponent(response);
              const res = await axios.get(
                `https://testapi.heckerman06.repl.co/api/other/bard-ai?prompt=${encodedResponse}&apikey=danielxd`
              );
              const { content, content2 } = res.data;
              if (content && content.length > 0) {
                const attachmentPayloads = [];
                for (let i = 0; i < content.length; i++) {
                  const photoUrl = content[i][0][0];
                  const imageResponse = await axios.get(photoUrl, {
                    responseType: "arraybuffer",
                  });
                  const imageData = Buffer.from(imageResponse.data, "binary");
                  const photoPath = path.join(__dirname, `${i + 1}.png`);
                  fs.writeFileSync(photoPath, imageData);
                  attachmentPayloads.push(
                    fs.createReadStream(photoPath)
                  );
                }
                api.sendMessage(
                  {
                    attachment: attachmentPayloads,
                    body: content2,
                  },
                  threadID,
                  messageID
                );
              } else {
                api.sendMessage(content2, threadID, messageID);
              }
            } catch (error) {
              console.error(
                "Error occurred while fetching data from the Bard API:",
                error
              );
              api.sendMessage(
                "An error occurred while fetching data from the Bard API.",
                threadID,
                messageID
              );
            }
          } else {
            const words = body.toLowerCase().split(" ");
            const badWordMatches = words.filter((word) =>
              filipinoBadwords.array.includes(word)
            );

            if (badWordMatches.length > 0) {
              if (!badWordCount.hasOwnProperty(senderID)) {
                badWordCount[senderID] = 1;
              } else {
                badWordCount[senderID]++;
              }

              if (badWordCount[senderID] > 3) {
                api.removeUserFromGroup(senderID, threadID, (err) => {
                  if (err) console.error("Error kicking user:", err);

                  const kickReason = "Repeated use of bad words.";
                  api.sendMessage(
                    {
                      body: `You have been kicked from the group due to ${kickReason}`,
                    },
                    senderID
                  );
                });
              } else {
                api.getUserInfo([senderID], (err, userInfo) => {
                  if (err) {
                    console.error("Error getting user info:", err);
                    return;
                  }

                  const userName = userInfo[senderID].name;

                  const mention = {
                    tag: `@${userName}`,
                    id: senderID,
                  };

                  api.sendMessage(
                    {
                      body:
                        "Warning: Using bad words is not allowed. Please refrain from using them.",
                      mentions: [mention],
                    },
                    threadID,
                    messageID
                  );
                  const kickThreshold = 3; // Number of bad word occurrences before kicking
                  const kickMessage = `@${userName} You have been kicked from the group due to repeated use of bad words.`;
                  const kickMention = {
                    tag: `@${userName}`,
                    id: senderID,
                  };

                  if (badWordCount[senderID] === kickThreshold) {
                    api.removeUserFromGroup(senderID, threadID, (err) => {
                      if (err) console.error("Error kicking user:", err);
                      api.sendMessage(
                        {
                          body: kickMessage,
                        },
                        senderID
                      );
                    });
                  }
                });
              }
            }
          }
          break;

        case "message_unsend":
          if (vips.includes(senderID)) {
            api.getUserInfo(senderID, (err, data) => {
              if (err) return console.error(err);
              const userName = data[senderID].name;
              vips.forEach((vipID) => {
                api.sendMessage(
                  {
                    body: `@${userName} unsent a message. Your action has been noted.`,
                    mentions: [
                      {
                        tag: `@${userName}`,
                        id: senderID,
                      },
                    ],
                  },
                  vipID
                )
                  .catch((err) =>
                    console.error("Error sending unsend message reply:", err)
                  );
              });
            });
          }
          break;
          case "event":
            if (event.logMessageType === "log:subscribe") {
              const joinedUserID = event.logMessageData.addedParticipants[0].userFbId;
              const userName = await getUserName(api, joinedUserID);
              const members = await getGroupMembers(api, threadID);
              const memberCount = members.length;
            
              const groupInfo = await api.getThreadInfo(threadID);
              const groupName = groupInfo.threadName;
            
              if (joinedUserID === api.getCurrentUserID()) {
                api.sendMessage("Connected successfully! Thank you for using this bot. Have fun using it!", threadID);
              } else {
                const randomWelcomeGifPath = getRandomGifPath(welcomeGifDirectory);
                if (randomWelcomeGifPath) {
                  api.sendMessage(
                    {
                      body: `Welcome, ${userName}! You are the ${memberCount} member of ${groupName}. Enjoy your time in the group ${groupName}.`,
                      attachment: fs.createReadStream(randomWelcomeGifPath),
                    },
                    threadID
                  );
                } else {
                  api.sendMessage(
                    `Welcome, ${userName}! You are the ${memberCount} member of ${groupName}. Enjoy your time in the group ${groupName}.`,
                    threadID
                  );
                }
              }
            }            
             else if (event.logMessageType === "log:unsubscribe") {
                const leftUserID = event.logMessageData.leftParticipantFbId;
                const userName = await getUserName(api, leftUserID);
                const members = await getGroupMembers(api, threadID);
                const memberCount = members.length;
                const randomGoodbyeGifPath = getRandomGifPath(goodbyeGifDirectory);
                if (randomGoodbyeGifPath) {
                  api.sendMessage(
                    {
                      body: `Goodbye, ${userName}! You were the ${memberCount} member. We'll miss you.`,
                      attachment: fs.createReadStream(randomGoodbyeGifPath),
                    },
                    threadID
                  );
                } else {
                  api.sendMessage(
                    `Goodbye, ${userName}! You were the ${memberCount} member. We'll miss you.`,
                    threadID
                  );
                }
              }
              break;
      }
    });
  }
);