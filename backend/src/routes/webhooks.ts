import { Router } from 'express';
import { Conversation } from '../models/Conversation';
import { logger } from '../utils/logger';

const router = Router();

// WhatsApp webhook verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp incoming messages
router.post('/whatsapp', async (req, res) => {
  try {
    const { entry } = req.body;
    
    if (!entry || !entry[0]?.changes) {
      return res.sendStatus(200);
    }

    for (const change of entry[0].changes) {
      if (change.field !== 'messages') continue;
      
      const value = change.value;
      if (!value.messages) continue;

      for (const message of value.messages) {
        const contact = value.contacts?.[0];
        const phoneNumber = message.from;
        const messageContent = message.text?.body || message.caption || '[Mídia]';
        
        // Find or create conversation
        let conversation = await Conversation.findOne({
          contactPhone: phoneNumber,
          channel: 'whatsapp',
        });

        if (!conversation) {
          conversation = new Conversation({
            organizationId: value.metadata?.phone_number_id, // Map to org
            contactName: contact?.profile?.name || phoneNumber,
            contactPhone: phoneNumber,
            channel: 'whatsapp',
            status: 'open',
            messages: [],
          });
        }

        // Add message
        conversation.messages.push({
          sender: 'client',
          senderName: contact?.profile?.name || phoneNumber,
          content: messageContent,
          type: message.type || 'text',
          externalId: message.id,
          timestamp: new Date(parseInt(message.timestamp) * 1000),
        });

        conversation.lastMessage = messageContent;
        conversation.unreadCount += 1;
        conversation.updatedAt = new Date();

        await conversation.save();
        
        logger.info(`WhatsApp message received from ${phoneNumber}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
    res.sendStatus(500);
  }
});

// Instagram webhook verification
router.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    logger.info('Instagram webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Instagram incoming messages
router.post('/instagram', async (req, res) => {
  try {
    const { entry } = req.body;
    
    if (!entry) {
      return res.sendStatus(200);
    }

    for (const e of entry) {
      if (!e.messaging) continue;

      for (const messaging of e.messaging) {
        const senderId = messaging.sender?.id;
        const message = messaging.message;
        
        if (!senderId || !message) continue;

        // Find or create conversation
        let conversation = await Conversation.findOne({
          contactId: senderId,
          channel: 'instagram',
        });

        if (!conversation) {
          conversation = new Conversation({
            organizationId: e.id, // Map to org
            contactId: senderId,
            contactName: senderId, // Fetch profile separately
            channel: 'instagram',
            status: 'open',
            messages: [],
          });
        }

        // Add message
        conversation.messages.push({
          sender: 'client',
          content: message.text || '[Mídia]',
          type: message.attachments ? 'attachment' : 'text',
          attachments: message.attachments || [],
          externalId: message.mid,
          timestamp: new Date(),
        });

        conversation.lastMessage = message.text || '[Mídia]';
        conversation.unreadCount += 1;
        conversation.updatedAt = new Date();

        await conversation.save();
        
        logger.info(`Instagram message received from ${senderId}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('Instagram webhook error:', error);
    res.sendStatus(500);
  }
});

// Telegram webhook
router.post('/telegram', async (req, res) => {
  try {
    const { message, callback_query } = req.body;
    
    const msg = message || callback_query?.message;
    if (!msg) {
      return res.sendStatus(200);
    }

    const chatId = msg.chat.id.toString();
    const senderId = msg.from.id.toString();
    const senderName = msg.from.first_name + (msg.from.last_name ? ` ${msg.from.last_name}` : '');
    const text = msg.text || callback_query?.data || '[Mídia]';

    // Find or create conversation
    let conversation = await Conversation.findOne({
      contactId: chatId,
      channel: 'telegram',
    });

    if (!conversation) {
      conversation = new Conversation({
        // organizationId would need to be determined by bot token mapping
        contactId: chatId,
        contactName: senderName,
        channel: 'telegram',
        status: 'open',
        messages: [],
      });
    }

    // Add message
    conversation.messages.push({
      sender: 'client',
      senderName,
      content: text,
      type: msg.photo ? 'image' : msg.document ? 'document' : 'text',
      externalId: msg.message_id?.toString(),
      timestamp: new Date(msg.date * 1000),
    });

    conversation.lastMessage = text;
    conversation.unreadCount += 1;
    conversation.updatedAt = new Date();

    await conversation.save();
    
    logger.info(`Telegram message received from ${senderName}`);

    res.sendStatus(200);
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    res.sendStatus(500);
  }
});

// Generic webhook (for Zapier, etc.)
router.post('/generic/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token against organization webhooks
    // Process incoming data based on configured mapping
    
    logger.info(`Generic webhook received: ${token}`);
    
    res.json({ received: true, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Generic webhook error:', error);
    res.sendStatus(500);
  }
});

export default router;
