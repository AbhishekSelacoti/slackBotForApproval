// Import necessary modules
const { App, ExpressReceiver } = require('@slack/bolt');
require('dotenv').config();

// Create an ExpressReceiver with the signing secret from environment variables
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRT,
});

// Initialize your Slack Bolt app with the bot token and ExpressReceiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: receiver,
});

// Define a slash command handler for /approval-test
app.command('/approval-test', async ({ ack, body, client }) => {
  // Acknowledge the receipt of the slash command
  await ack();

  // Open a modal when the slash command is triggered
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'approval_modal',
        title: {
          type: 'plain_text',
          text: 'Request Approval',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'approver_block',
            element: {
              type: 'users_select',
              action_id: 'approver',
            },
            label: {
              type: 'plain_text',
              text: 'Select Approver',
            },
          },
          {
            type: 'input',
            block_id: 'text_block',
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'approval_text',
            },
            label: {
              type: 'plain_text',
              text: 'Approval Text',
            },
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit',
        },
      },
    });
  } catch (error) {
    console.error('Error opening modal:', error);
  }
});

// Define a view submission handler for the approval modal
app.view('approval_modal', async ({ ack, body, view, client }) => {
  // Acknowledge the receipt of the view submission
  await ack();

  const approver = view.state.values.approver_block.approver.selected_user;
  const approvalText = view.state.values.text_block.approval_text.value;

  console.log('Approver:', approver);
  console.log('Approval Text:', approvalText);

  // Send a message to the approver
  try {
    const result = await client.chat.postMessage({
      channel: approver,
      text: `You have a new approval request from <@${body.user.id}>: ${approvalText}`,
      attachments: [
        {
          text: 'Do you approve this request?',
          fallback: 'You are unable to choose an option',
          callback_id: 'approval_request',
          color: '#3AA3E3',
          attachment_type: 'default',
          actions: [
            {
              name: 'approve',
              text: 'Approve',
              type: 'button',
              value: 'approve',
            },
            {
              name: 'reject',
              text: 'Reject',
              type: 'button',
              value: 'reject',
            },
          ],
        },
      ],
    });
    console.log('Message sent to approver:', result.ts);
  } catch (error) {
    console.error('Error sending message to approver:', error);
  }
});

// Define an action handler for the approval response
app.action({ callback_id: 'approval_request' }, async ({ body, ack, action, client }) => {
  await ack();

  const actionValue = action.value;
  const requesterIdMatch = body?.original_message?.text?.match(/<@(.*?)>/);
  const requesterId = requesterIdMatch ? requesterIdMatch[1] : null;

  console.log(body);

  // Log the requesterId to debug
  console.log('Requester ID:', requesterId);

  if (!requesterId) {
    console.error('Error: Unable to extract requester ID');
    return;
  }

  // Notify the requester about the approval response
  try {
    const result = await client.chat.postMessage({
      channel: requesterId,
      text: `Your request was ${actionValue === 'approve' ? 'approved' : 'rejected'} by <@${body.user.id}>.`,
    });
    console.log('Message sent to requester:', result.ts);
  } catch (error) {
    console.error('Error sending message to requester:', error);
  }
});

// Define a custom endpoint for handling /approval-test
receiver.router.post('/approval-test', (req, res) => {
  res.send('Approval request Sent');
});

// Start your app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bot is running!');
})();
