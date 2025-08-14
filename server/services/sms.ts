import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

// Initialize Twilio client
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  try {
    // For development, log OTP to console
    console.log(`📱 SMS OTP for ${to}: ${message}`);
    
    if (!twilioClient || !fromNumber) {
      console.log('⚠️  Twilio not configured, OTP logged to console only');
      return { success: true, messageId: 'dev-mode' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    console.log(`✅ SMS sent successfully: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function formatOTPMessage(otp: string, purpose: string): string {
  const purposeText = purpose === 'admin_login' ? 'Admin Login' : 'Coach Login';
  return `Your Ievolve Sports Event Management ${purposeText} OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;
}