# AI Call Answering Agent - n8n Workflow

This n8n workflow creates an intelligent AI-powered call answering agent that can handle incoming phone calls using Twilio and OpenAI's GPT-4.

## Features

- **Automated Call Answering**: Answers incoming calls with AI-generated greetings
- **Speech Recognition**: Converts caller speech to text using Twilio's speech recognition
- **Intelligent Responses**: Uses GPT-4 to generate contextual, professional responses
- **Conversation Flow**: Maintains natural conversation with follow-up questions
- **Call Logging**: Stores all call sessions and conversation logs in PostgreSQL
- **Smart Call Ending**: Detects when to end calls gracefully

## Workflow Components

### 1. Incoming Call Handler
- **Webhook - Incoming Call**: Receives incoming call webhooks from Twilio
- **Extract Call Data**: Processes caller information (phone number, Call SID, status)
- **AI Agent - Initial Greeting**: Generates personalized greeting using GPT-4
- **Respond with TwiML**: Sends TwiML response to play greeting and prompt for input

### 2. Call Input Processor
- **Webhook - Call Input**: Receives caller's speech input
- **Extract Speech Input**: Processes transcribed speech and confidence score
- **AI Agent - Process Request**: Generates intelligent response to caller's request
- **Prepare Response**: Formats response for delivery

### 3. Conversation Router
- **Check if End Call**: Determines if conversation should end
- **End Call**: Sends goodbye message and hangs up
- **Continue Conversation**: Asks follow-up questions and continues dialogue

### 4. Logging System
- **Log Initial Call**: Records new call session
- **Save Call Session**: Stores call metadata in database
- **Log Conversation**: Records each conversation exchange

## Setup Instructions

### Prerequisites

1. **n8n Instance**: Running n8n instance (self-hosted or cloud)
2. **Twilio Account**: Active Twilio account with phone number
3. **OpenAI API Key**: Valid OpenAI API key
4. **PostgreSQL Database**: Database for call logging (optional)

### Step 1: Import Workflow

1. Open n8n
2. Click "Import from File"
3. Select `ai-call-agent.json`
4. Click "Import"

### Step 2: Configure Credentials

#### OpenAI API Credentials
1. Click on any "AI Agent" node
2. Click "Create New Credential"
3. Enter your OpenAI API key
4. Save credentials

#### PostgreSQL Credentials (Optional)
1. Click on "Log Conversation" or "Save Call Session" node
2. Configure PostgreSQL connection:
   - Host: Your database host
   - Database: Your database name
   - User: Database username
   - Password: Database password
3. Save credentials

### Step 3: Create Database Tables (Optional)

Run these SQL commands in your PostgreSQL database:

```sql
-- Call sessions table
CREATE TABLE call_sessions (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(255) UNIQUE NOT NULL,
    caller_number VARCHAR(50),
    call_start TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call logs table
CREATE TABLE call_logs (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(255) NOT NULL,
    user_input TEXT,
    ai_response TEXT,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (call_sid) REFERENCES call_sessions(call_sid)
);

-- Create indexes for better performance
CREATE INDEX idx_call_sessions_sid ON call_sessions(call_sid);
CREATE INDEX idx_call_logs_sid ON call_logs(call_sid);
```

### Step 4: Configure Twilio

1. **Get Webhook URLs**:
   - In n8n, click on "Webhook - Incoming Call" node
   - Copy the Production URL (e.g., `https://your-n8n.com/webhook/incoming-call`)
   - Note the "call-input" webhook URL as well

2. **Configure Twilio Phone Number**:
   - Log in to Twilio Console
   - Go to Phone Numbers > Manage > Active Numbers
   - Click on your phone number
   - Under "Voice & Fax", set:
     - **A CALL COMES IN**: Webhook
     - **URL**: Your n8n webhook URL for incoming calls
     - **HTTP Method**: POST
   - Save configuration

### Step 5: Set Environment Variable

In your n8n instance, set the environment variable:

```bash
N8N_WEBHOOK_URL=https://your-n8n-instance.com
```

Or update the workflow to use your actual n8n URL instead of `$env.N8N_WEBHOOK_URL`.

### Step 6: Activate Workflow

1. Click the "Active" toggle in the top right
2. Workflow is now ready to receive calls!

## Customization

### Modify AI Agent Behavior

Edit the system prompts in the "AI Agent" nodes:

**Initial Greeting Prompt**:
```javascript
"You are a helpful AI phone assistant. Answer calls professionally and assist callers with their inquiries. Keep responses concise and clear for phone conversations. You can help with: 1) General information about the company, 2) Scheduling appointments, 3) Taking messages, 4) Providing support. Always be polite and professional."
```

**Request Processing Prompt**:
```javascript
"You are a helpful AI phone assistant. Respond to the caller's request professionally and helpfully. Keep responses brief and conversational (2-3 sentences max). If asked to schedule an appointment, confirm the date and time. If asked for information, provide it clearly. If you cannot help, politely explain and offer alternatives."
```

### Change Voice

Modify the TwiML responses to use different Twilio voices:
- `alice` (default)
- `man`
- `woman`
- `Polly.Amy` (Amazon Polly voices)

### Adjust Speech Timeout

In the TwiML responses, modify `speechTimeout` parameter (default: 3 seconds).

### Add More Languages

Change the `language` parameter in the Gather element:
- `en-US` - English (US)
- `es-ES` - Spanish
- `fr-FR` - French
- `de-DE` - German

## Testing

1. Call your Twilio phone number
2. Listen to the AI greeting
3. Speak your request after the prompt
4. Have a conversation with the AI agent
5. Say "goodbye" to end the call
6. Check database logs to verify conversation was recorded

## Troubleshooting

### No Response from AI
- Verify OpenAI API credentials are correct
- Check API key has sufficient credits
- Review n8n execution logs for errors

### Twilio Not Triggering Webhook
- Ensure webhook URLs are publicly accessible
- Verify Twilio phone number is configured correctly
- Check Twilio debugger for webhook errors

### Database Errors
- Verify PostgreSQL credentials
- Ensure tables are created
- Check database permissions
- You can remove database nodes if logging isn't needed

### Speech Recognition Issues
- Ensure caller speaks clearly
- Check Twilio Console for transcription accuracy
- Adjust `speechTimeout` if needed

## Advanced Features to Add

1. **Appointment Scheduling**: Integrate with Google Calendar or other scheduling APIs
2. **CRM Integration**: Connect to Salesforce, HubSpot, etc.
3. **SMS Follow-up**: Send SMS summaries after calls
4. **Call Recording**: Enable Twilio call recording
5. **Analytics Dashboard**: Create visualization of call metrics
6. **Multi-language Support**: Detect caller language and respond accordingly
7. **Sentiment Analysis**: Track caller sentiment throughout conversation
8. **Queue System**: Handle multiple simultaneous calls

## Cost Considerations

- **Twilio**: ~$0.013/min for voice calls
- **OpenAI GPT-4**: ~$0.03 per 1K tokens
- **n8n**: Free (self-hosted) or paid (cloud)
- **PostgreSQL**: Free (self-hosted) or cloud pricing

## Support

For issues or questions:
- n8n Documentation: https://docs.n8n.io
- Twilio Documentation: https://www.twilio.com/docs
- OpenAI Documentation: https://platform.openai.com/docs

## License

This workflow is provided as-is for educational and commercial use.
