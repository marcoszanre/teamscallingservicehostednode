const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const fetch = require("node-fetch");
var qs = require('qs');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

// Initialize access token variable
let accessToken = "";

getToken();

async function getToken() {
    
    const tokenEndpoint = 'https://login.microsoftonline.com/' + process.env.tenantID + '/oauth2/v2.0/token';
    
    const tokenPayload = {
        grant_type: 'client_credentials',
        client_id: process.env.BotChannelRegistrationId,
        client_secret: process.env.BotChannelRegistrationPassword,
        scope: 'https://graph.microsoft.com/.default'
    }
    
    // Retrieve Token
    const tokenRequest = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: qs.stringify(tokenPayload),
    });

    const response = await tokenRequest.json();
    accessToken = response.access_token;
    console.log('\n' + '--------THIS IS YOUR ACCESS TOKEN------------' + '\n' + '\n' + accessToken + '\n' + '\n' + '_____________________________________________' + '\n' + '\n' + 'Waiting for call to be placed...');
    
}

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');

// This bot's main dialog.
const { MyBot } = require('./bot');

// Create HTTP server
const server = restify.createServer();

// Initial Values
const callbackUri = process.env.ngrok + "/api/calls/hub";
const basePath = "https://graph.microsoft.com/v1.0/communications/calls/";

server.use(restify.plugins.bodyParser({
    maxBodySize: 0,
    mapParams: true
}));

server.listen(process.env.port || process.env.PORT || 8080, () => {
    console.log(`\n${ server.name } listening to ${ server.url }` + '\n' + 'You can also open http://localhost:4040/inspect/http to inspect the endpooint.');
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about how bots work.
const adapter = new BotFrameworkAdapter({
    appId: process.env.BotChannelRegistrationId,
    appPassword: process.env.BotChannelRegistrationPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops... Something went wrong!`);
};

// Create the main dialog.
const myBot = new MyBot();

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await myBot.run(context);
    });
});

// Listen for incoming calls.
server.post('/api/calls', (req, res) => {

    // ANSWER CALL
    let CommID = req.body.value[0].resourceData.id;
    console.log('INCOMING CALL...')
    res.send(202);
    res.end();
    answerCall(CommID);

});

// Listen for incoming calls notifications.
server.post('/api/calls/hub', (req, res) => {

    res.send(202);
    res.end();

    let CommID = req.body.value[0].resourceUrl.split("/")[3];

    if ((req.body.value[0].resourceData).hasOwnProperty('state')) {

        switch(req.body.value[0].resourceData.state) {
        
            // CALL SENDO ESTABELECIDA
            case 'establishing':
            console.log('The call is being established... :D');
            break;
    
            // CALL ESTABELECIDA
            case 'established':

            // CALL ESTABLISHED, PLAY MEDIA PROMPT
            if ((req.body.value[0].resourceData).hasOwnProperty('mediaState')) {
                console.log('Call Established. Press 1 to record an audio clip (and * after the recording) and 2 to hang up! :)');
                playPrompt(CommID);
                subscribeToTone(CommID);
            }

            // ACT ON TONE RECEIVED
            if ((req.body.value[0].resourceData).hasOwnProperty('toneInfo')) {
                let dialedTone = (req.body.value[0].resourceData.toneInfo.tone).substr(-1);             
                console.log('You pressed the tone ' + dialedTone);
                runToneLogic(CommID, dialedTone);
            }
            break;

            // CALL BEING TERMINATED
            case 'terminating':
            console.log('The call is being terminated... :(');
            break;
    
            // CALL TERMINADA
            case 'terminated':
            console.log('Call Terminated :/');
            break;
    
            // DEFAULT ROUTE
            default:
            console.log('Ops... Leverage ngrok inspector for additional fields');
            console.log(req.body.value[0].resourceData)
            console.log('____________________________________________________________________');
        }

    }
    
    if (req.body.value[0]) {
        const response = JSON.stringify(req.body.value[0]);
        console.log('\n' + response + '\n');    
    }
    
});

async function answerCall(CommID) {
    const answergraphURL = basePath + CommID + '/answer';
    console.log('This is the endpoint to answer: ' + answergraphURL);

    const answerPayload = {
        "callbackUri": process.env.ngrok + "/api/calls/hub",
        "acceptedModalities": [ "audio" ],
        "mediaConfig": {
            "@odata.type": "#microsoft.graph.serviceHostedMediaConfig"
        }
    }

    // Answer Call
    await fetch(answergraphURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer " + accessToken,
        },
        body: JSON.stringify(answerPayload),
    });

    // const response = await answerRequest.();
}

async function playPrompt(CommID) {
    
    const playPromptgraphURL = basePath + CommID + '/playPrompt';
        // PLAY PROMPT
        const playPromptPayload = {
            "clientContext": "playprompt-client-context",
            "prompts": [
                {
                "@odata.type": "#microsoft.graph.mediaPrompt",
                "mediaInfo": {
                    "@odata.type": "#microsoft.graph.mediaInfo",
                    "uri": process.env.playPromptURL,
                    "resourceId": "my-play-prompt"
                }
                }
            ],
            "loop": false
        }
    
        // Play Prompt
        await fetch(playPromptgraphURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + accessToken,
            },
            body: JSON.stringify(playPromptPayload),
        });

}

async function subscribeToTone(CommID) {
    
    const subscribeToTonegraphURL = basePath + CommID + '/subscribeToTone';
        // SUBSCRIBE TO TONE
        const subscribePayload = {
            "clientContext": "subscribing-to-tone-client-context"
        }
    
        // Subscribe to Tone
        await fetch(subscribeToTonegraphURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + accessToken,
            },
            body: JSON.stringify(subscribePayload),
        });

}


function runToneLogic(CommID, dialedTone) {
    
    switch(dialedTone) {
        
        // RECORD AN AUDIO CLIP
        case '1':
        recordAudioClip(CommID);
        console.log('Audio clip is being recorded, please leverage the ngrok inspector to retrieve the location and token to get the audio as this has not being implemented yet.');
        break;

        // JUST HANG UP
        case '2':
        hangUp(CommID)
        console.log('Hanging up, bye! :)');
        break;
        
        // Process recording
        case 'r':
        console.log("Closing recording, if you're coming from tone 1!");
        break;

        // NOT MANAGED TONE
        default:
        console.log("THE TONE DIALED DOESN'T HAVE A HANDLE YET :/");
        break;
    }

}

async function recordAudioClip(CommID) {
    
    const recordAudioClipGraphURL = 'https://graph.microsoft.com/v1.0/communications/calls/' + CommID + '/record';
        // RECORD PROMPT
        const recordPayload = {
            "bargeInAllowed": true,
            "clientContext": "record-audio-clip-context",
            "maxRecordDurationInSeconds": 10,
            "initialSilenceTimeoutInSeconds": 5,
            "maxSilenceTimeoutInSeconds": 2,
            "playBeep": true,
            "stopTones": [ "*" ]
        }
    
        // Send Record
        await fetch(recordAudioClipGraphURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + accessToken,
            },
            body: JSON.stringify(recordPayload),
        });

}

async function hangUp(CommID) {
    const hangUpgraphURL = basePath + CommID;
        // HANG UP
        await fetch(hangUpgraphURL, {
            method: 'DELETE',
            headers: {
                'Authorization': "Bearer " + accessToken,
            },
        });

}

// Create calls ** NOT WORKING **
server.post('/api/calls/create', async (req, res) => {

    console.log("endpoint called");

    const callData = {
        "@odata.type": "#microsoft.graph.call",
        "callbackUri": callbackUri,
        "targets": [
          {
            "@odata.type": "#microsoft.graph.invitationParticipantInfo",
            "identity": {
              "@odata.type": "#microsoft.graph.identitySet",
              "user": {
                "@odata.type": "#microsoft.graph.identity",
                "displayName": process.env.userDisplayName,
                "id": process.env.userId
              }
            }
          }
        ],
        "requestedModalities": [
          "audio"
        ],
        "mediaConfig": {
          "@odata.type": "#microsoft.graph.serviceHostedMediaConfig"
        }
    }

    // Initiate Call
    const callRequest = await fetch(basePath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(callData),
    });

    console.log(callRequest.status);
    res.send(callRequest.status)
    
});

// Join Scheduled Meeting
server.post('/api/calls/join', async (req, res) => {

    console.log("endpoint called, let's try to join you to the meeting!");

    const callData = {
        "@odata.type": "#microsoft.graph.call",
        "callbackUri": callbackUri,
        "requestedModalities": [
          "audio"
        ],
        "mediaConfig": {
          "@odata.type": "#microsoft.graph.serviceHostedMediaConfig",
          "preFetchMedia": [
           {
             "uri": process.env.playPromptURL,
             "resourceId": "play-prompt"
           }
          ],
        },
        "chatInfo": {
          "@odata.type": "#microsoft.graph.chatInfo",
          "threadId": process.env.threadId,
          "messageId": "0"
        },
        "meetingInfo": {
          "@odata.type": "#microsoft.graph.organizerMeetingInfo",
          "organizer": {
            "@odata.type": "#microsoft.graph.identitySet",
            "user": {
              "@odata.type": "#microsoft.graph.identity",
              "id": process.env.userId,
              "displayName": process.env.userDisplayName,
              "tenantId": process.env.tenantID
            }
          },
          "allowConversationWithoutHost": true
        },
        "tenantId": process.env.tenantID
    }

    // Join Meeting
    const callRequest = await fetch(basePath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(callData),
    });

    if (callRequest.status === "201") {
        console.log("Joining you to the meeting");
    }
    
    res.send(callRequest.status);
    
});

// Mute Participant in Meeting ** WORKS ONLY FOR THE BOT **
server.post('/api/calls/participant/mute', async (req, res) => {

    const callId = req.body.callId;
    console.log("callid is " + callId);

    const muteURL = basePath + callId + "/participants/" + process.env.userId + "/mute";
    console.log("mute URL is " + muteURL);

    console.log("endpoint called, let's try to mute a participant in the meeting!");

    const callData = {
        "clientContext": "mute-participant"
    }

    // Join Meeting
    const callRequest = await fetch(muteURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(callData),
    });

    if (callRequest.status === "200") {
        console.log("Muting specified participant! ;)");
    }
    
    res.send(callRequest.status);
    
});