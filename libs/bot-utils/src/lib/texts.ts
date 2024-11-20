import { z } from 'zod';

import { envSchema } from '@revelio/env';

export function getPlansDescription(env: z.infer<typeof envSchema>) {
  return `- **Free Plan**
  - Price: Free
  - Includes:
    - 📝 Text messages: Up to 10 messages per day
  - Limitations:
    - ❌ Image generation: Not available
    - ❌ Speech synthesis (TTS): Not available
    - ❌ Reminders: Not available
    - ❌ Bot has no long-term memory
    - ❌ Web search: Not available
    - ❌ Weather: Not available


- **Basic Plan**
  - Price: ⭐${env.BASIC_PLAN_PRICE} per month
  - Includes:
    - 📝 Text messages: Up to 100 messages per day
    - 🖼️ Image generation: Up to 10 images per month
    - 🔊 Speech synthesis (TTS): Up to 10,000 characters per month
    - ⏰ Reminders: Create up to 20 reminders
    - 💾 Bot can remember any kind of information
    - 📩 Priority support

- **Premium Plan**
  - Price: ⭐️${env.PREMIUM_PLAN_PRICE} per month
  - Includes:
    - 📝 Text messages: Up to 500 messages per day
    - 🖼️ Image generation: Up to 50 images per month
    - 🔊 Speech synthesis (TTS): Up to 50,000 characters per month
    - ⏰ Reminders: No limits
    - 💾 Bot can remember any kind of information
    - 🚀 Access to new features: Early access
    - 📩 Priority support`;
}

export const helpText = `👋 **I'm Revelio, your personal assistant!**

Here are some things I can help you with:

💡 **/help** – Show this message
💳 **/billing** – Manage your billing information
🔄 **/reset** – Reset the conversation.

You can also send me text messages, and I'll respond to them. 📜

Send me a voice message or a small video, and I'll answer you with a text message. 🎤`;
