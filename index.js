const dotenv = require('dotenv');
const path = require('path');
const restify = require('restify');
const request = require('request');

// Import required bot configuration.
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({ path: ENV_FILE });

let accessToken = 'blank';

var tokenEndpoint = 'https://login.microsoftonline.com/' + process.env.tenantID + '/oauth2/v2.0/token';

request.post({
    url: tokenEndpoint,
    form: {
        grant_type: 'client_credentials',
        client_id: process.env.MicrosoftAppId,
        client_secret: process.env.MicrosoftAppPassword,
        scope: 'https://graph.microsoft.com/.default'
    }
}, function (err, httpResponse, body) {
    accessToken = JSON.parse(body).access_token
    console.log('\n' + '--------THIS IS YOUR ACCESS TOKEN------------' + '\n' + '\n' + accessToken + '\n' + '\n' + '_____________________________________________' + '\n' + '\n' + 'Waiting for call to be placed...');
})

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');

// This bot's main dialog.
const { MyBot } = require('./bot');

// Create HTTP server
const server = restify.createServer();

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
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
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
    answerCall(CommID);

});

// Listen for incoming calls notifications.
server.post('/api/calls/hub', (req, res) => {

    res.send(202);

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
                console.log('Call Established. Press 1 to record an audio clip (and * after the recording) and 1 to hang up! :)');
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

    } else {

    }
    
});

function answerCall(CommID) {
    let answergraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/answer';
    console.log('This is the endpoint to answer: ' + answergraphURL);

            request.post(
                {
                    url:answergraphURL,
                    json: 
                    {
                        "callbackUri": process.env.ngrok + "/api/calls/hub",
                        "acceptedModalities": [ "audio" ],
                        "mediaConfig": {
                            "@odata.type": "#microsoft.graph.serviceHostedMediaConfig"
                        }
                    }
            }).auth(null, null, true, accessToken);
}

function playPrompt(CommID) {
    
    let playPromptgraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/playPrompt';
        // PLAY PROMPT
        request.post(
            {
                url:playPromptgraphURL,
                json: 
                {
                    "clientContext": "playprompt-client-context",
                    "prompts": [
                        {
                        "@odata.type": "#microsoft.graph.mediaPrompt",
                        "mediaInfo": {
                            "@odata.type": "#microsoft.graph.mediaInfo",
                            "uri": process.env.playPromptURL,
                            "resourceId": "2G6DE2D4-CD51-4309-8DAA-70768651088E"
                        }
                        }
                    ],
                    "loop": false
                }
        }).auth(null, null, true, accessToken), function(err,httpResponse,body)
        {
            if (err) {
                console.log(err);
            }
            console(body);
        };
}

function subscribeToTone(CommID) {
    
    let subscribeToTonegraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/subscribeToTone';
        // PLAY PROMPT
        request.post(
            {
                url:subscribeToTonegraphURL,
                json: 
                {
                    "clientContext": "subscribing-to-tone-client-context",
                }
        }).auth(null, null, true, accessToken), function(err,httpResponse,body)
        {
                console('Successfully subsribed to tone :D');
        };
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

        // NOT MANAGED TONE
        default:
        console.log("THE TONE DIALED DOESN'T HAVE A HANDLE YET :/");
        break;
    }

    let subscribeToTonegraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/subscribeToTone';
        // PLAY PROMPT
        request.post(
            {
                url:subscribeToTonegraphURL,
                json: 
                {
                    "clientContext": "subscribing-to-tone-client-context",
                }
        }).auth(null, null, true, accessToken), function(err,httpResponse,body)
        {
                console('Successfully subsribed to tone :D');
    };
}

function recordAudioClip(CommID) {
    
    let recordAudioClipGraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID + '/record';
        // PLAY PROMPT
        console.log('To finish recording, press * ')
        request.post(
            {
                url:recordAudioClipGraphURL,
                json: 
                {
                    "bargeInAllowed": true,
                    "clientContext": "record-audio-clip-context",
                    "maxRecordDurationInSeconds": 10,
                    "initialSilenceTimeoutInSeconds": 5,
                    "maxSilenceTimeoutInSeconds": 2,
                    "playBeep": true,
                    "stopTones": [ "*" ]
                }
        }).auth(null, null, true, accessToken);
}

function hangUp(CommID) {
    let hangUpgraphURL = 'https://graph.microsoft.com/beta/app/calls/' + CommID;
        // HANG UP
        request.delete(
            {
                url:hangUpgraphURL
        }).auth(null, null, true, accessToken);
}