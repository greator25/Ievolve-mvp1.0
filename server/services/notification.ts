export interface SMSMessage {
  to: string;
  message: string;
}

export class NotificationService {
  // Send SMS notification
  static async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // For now, just log the message
      console.log(`SMS to ${to}: ${message}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  // Send OTP message
  static async sendOTP(mobileNumber: string, otp: string): Promise<boolean> {
    const message = `Your Ievolve Events OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return await this.sendSMS(mobileNumber, message);
  }

  // Send check-in notification to transport POC
  static async sendCheckinNotification(
    transportPoc: string,
    coachId: string,
    playerCount: number,
    checkinTime: string
  ): Promise<boolean> {
    const message = `CM Trophy Update: Coach ${coachId} has checked in ${playerCount} players at ${checkinTime}. - Ievolve Events`;
    return await this.sendSMS(transportPoc, message);
  }

  // Send early checkout notification
  static async sendEarlyCheckoutNotification(
    mobileNumber: string,
    participantName: string,
    newCheckoutDate: string
  ): Promise<boolean> {
    const message = `CM Trophy Update: ${participantName}, your checkout date has been updated to ${newCheckoutDate}. Please plan accordingly. - Ievolve Events`;
    return await this.sendSMS(mobileNumber, message);
  }

  // Send bulk notifications
  static async sendBulkNotifications(messages: SMSMessage[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const success = await this.sendSMS(msg.to, msg.message);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    return { sent, failed };
  }
}
