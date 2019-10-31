# Sample Teams Calling bot with Node.js and service hosted media

Demonstrate the ability to answer and manage a call with Teams service hosted media capabilities exposed through Microsoft Graph.

Disclaimer 1: This sample is an extension of the Echo bot, available through bot builder as a [Yeoman generator](https://www.npmjs.com/package/generator-botbuilder?activeTab=readme)

Disclaimer 2: **This code is provided as is.**

## Demo

[![Teams Calling Bot demo sample](https://img.youtube.com/vi/0xQMIyF5F60/0.jpg)](https://youtu.be/0xQMIyF5F60)

## Prerequisites

* Node.js
* Git
* Visual Studio Code
* ngrok

## To run the bot

- Initiate ngrok *ngrok http 8080* and take note of the Forwarding Address
- Create a new app with Teams App Studio and register a new bot with the personal scope (take note of the App ID and App Secret values - **don't forget to enable calling for this bot and developer preview for your Teams web/destop client**)
- Fill out the bot messages and calling endpoints as follow: ngrokForwardingAddress/api/messages and ngrokForwardingAddress/api/calls
- Open the bot registration in Azure AD (*https://aad.portal.azure.com*) and enable and consent the calling bot permissions, according to the [documentation](https://docs.microsoft.com/en-us/graph/api/resources/communications-api-overview?view=graph-rest-beta)
- Git clone this repository
- Create a new .env file, if not available, and add (and fill out) the following items: MicrosoftAppId, MicrosoftAppPassword, tenantID, ngrok and playPromptURL. For the playPromptURL, I recommend a small wav file, that could be hosted in an Azure blob storage.
- Install all dependencies (npm install)
- From a console, e.g. PowerShell, run *node index.js*
- Install the Teams App Studio and call the bot

Moreover, it is highly recommended to inspect calls being made to your ngrok Forwarding Address endpoint through the following URL (http://localhost:4040), and optionally, additional calls, once the call has been established, can be made directly through Postman or Fiddler (e.g. play prompt, record audio clip or subscribe to tone).

The usage flow for this demo bot is as follows:

1. User calls bot from within a Team custom app
2. Bot answers with a default audio message
3. Bot listens for tones pressed by the user: Tone 1 will route the bot to record an audio clip, whose content can be obtained from the location and token specified in the request through the ngrok inspector. Tone 2 will hang up. Besides the ngrok inspector, bot actions are logged (console.log) to the node terminal.

This bot implements the following Microsoft Graph calling endpoints:
- Answer call
- Play Prompt
- Subscribe to tone
- Record Audio Clip
- Delete (Hang Up)
- Listen for notification events

### Next Steps

Following are some items that could be considered for improvements of this sample:

- Validate bot incoming requests (best practice)
- Integrate with Cognitive Services to leverage the audio clips to understand what was said and act accordingly
- Implement additional endpoints, such as Redirect Call, Create and Participants management scenarios.

## Further reading

- [Working with the communications API in Microsoft Graph](https://docs.microsoft.com/en-us/graph/api/resources/communications-api-overview?view=graph-rest-beta)
- [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
- [Language Understanding using LUIS](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/)
- [Channels and Bot Connector Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0)
- [Restify](https://www.npmjs.com/package/restify)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [yeoman bot builder generator](https://www.npmjs.com/package/generator-botbuilder?activeTab=readme)