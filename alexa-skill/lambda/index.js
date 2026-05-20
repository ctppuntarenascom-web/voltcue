const Alexa = require("ask-sdk-core");

const CLOUD_API_URL = process.env.VOLTCUE_CLOUD_API_URL || "http://localhost:8799";
const DEMO_USER_TOKEN = process.env.VOLTCUE_USER_TOKEN || "demo-user-token";

const intentToAction = {
  ShutdownIntent: "shutdown",
  RestartIntent: "restart",
  SleepIntent: "sleep",
  LockIntent: "lock",
};

const actionSpeech = {
  shutdown: "Okay, I sent the shutdown command to your PC.",
  restart: "Okay, I sent the restart command to your PC.",
  sleep: "Okay, I sent the sleep command to your PC.",
  lock: "Okay, I sent the lock command to your PC.",
};

async function sendCommand(action) {
  const response = await fetch(`${CLOUD_API_URL.replace(/\/$/, "")}/api/alexa/command`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEMO_USER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.message || "VoltCue could not send the command.");
  }
  return data;
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest";
  },
  handle(handlerInput) {
    const speakOutput = "VoltCue is ready. You can say, turn off my PC, restart my PC, sleep my computer, or lock my desktop.";
    return handlerInput.responseBuilder.speak(speakOutput).reprompt("What would you like VoltCue to do?").getResponse();
  },
};

const PowerCommandIntentHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    return requestType === "IntentRequest" && Boolean(intentToAction[intentName]);
  },
  async handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const action = intentToAction[intentName];

    try {
      await sendCommand(action);
      return handlerInput.responseBuilder.speak(actionSpeech[action]).getResponse();
    } catch (error) {
      const speakOutput = `I could not reach VoltCue. ${error.message}`;
      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent";
  },
  handle(handlerInput) {
    const speakOutput = "You can say, turn off my PC, restart my PC, sleep my computer, or lock my desktop.";
    return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(Alexa.getIntentName(handlerInput.requestEnvelope));
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak("Okay.").getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(error);
    return handlerInput.responseBuilder.speak("Sorry, VoltCue had a problem.").getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PowerCommandIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();

exports._test = {
  sendCommand,
  intentToAction,
};
