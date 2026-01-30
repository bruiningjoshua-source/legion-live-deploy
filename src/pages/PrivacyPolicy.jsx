import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Database, Share2, Lock, Bell, Globe, Trash2 } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = "January 30, 2026";
  
  const sections = [
    {
      icon: Database,
      title: "1. Information We Collect",
      content: `
**1.1 Information You Provide**
- **Account Information**: Email address, username, display name, profile picture, date of birth
- **Payment Information**: Billing address, payment method details (processed securely by Stripe)
- **Content**: Videos, streams, chat messages, comments, and other content you create
- **Communications**: Messages you send to us or other users

**1.2 Information Collected Automatically**
- **Device Information**: Device type, operating system, browser type, IP address
- **Usage Data**: Pages visited, features used, stream viewing history, interaction patterns
- **Location Data**: General location based on IP address (we do not collect precise GPS location)
- **Cookies & Tracking**: We use cookies and similar technologies to improve your experience

**1.3 Information from Third Parties**
- Social media profiles (if you choose to link them)
- Payment verification from payment processors
- Age verification services
      `
    },
    {
      icon: Eye,
      title: "2. How We Use Your Information",
      content: `
**2.1 Core Services**
- Provide, maintain, and improve Legion Live
- Process transactions and send related information
- Enable creator monetization and payouts
- Facilitate communication between users

**2.2 Safety & Security**
- Detect and prevent fraud, abuse, and security threats
- Enforce our Terms of Service and Community Guidelines
- Verify age for age-restricted content
- Moderate content and protect users

**2.3 Personalization**
- Recommend streams and content based on your interests
- Customize your experience and preferences
- Show relevant notifications and updates

**2.4 Communications**
- Send service-related announcements
- Respond to your inquiries and support requests
- Send marketing communications (with your consent)
      `
    },
    {
      icon: Share2,
      title: "3. Information Sharing",
      content: `
**3.1 Public Information**
The following is visible to other users:
- Username and display name
- Profile picture and bio
- Public streams and content
- Follower/following counts

**3.2 Service Providers**
We share information with trusted service providers who assist us:
- Payment processing (Stripe)
- Video streaming infrastructure (Agora)
- Cloud hosting and storage
- Analytics and monitoring

**3.3 Legal Requirements**
We may disclose information when required by law or to:
- Comply with legal process
- Protect our rights and safety
- Prevent fraud or illegal activity
- Respond to government requests

**3.4 Business Transfers**
If Legion Live is involved in a merger or acquisition, your information may be transferred as part of that transaction.

**3.5 With Your Consent**
We may share information for other purposes with your explicit consent.
      `
    },
    {
      icon: Lock,
      title: "4. Data Security",
      content: `
**4.1 Security Measures**
We implement industry-standard security measures including:
- Encryption of data in transit (TLS/SSL)
- Encryption of sensitive data at rest
- Regular security audits and penetration testing
- Access controls and authentication
- Monitoring for suspicious activity

**4.2 Data Breach Response**
In the event of a data breach, we will:
- Notify affected users within 72 hours
- Report to relevant authorities as required
- Take immediate steps to contain and remediate
- Provide guidance on protective measures

**4.3 Your Responsibilities**
- Use a strong, unique password
- Enable two-factor authentication
- Do not share your account credentials
- Report suspicious activity immediately
      `
    },
    {
      icon: Globe,
      title: "5. International Transfers",
      content: `
**5.1 Data Location**
Your information may be processed in the United States and other countries where our service providers operate.

**5.2 Transfer Safeguards**
For transfers outside your country, we use:
- Standard Contractual Clauses approved by regulatory authorities
- Adequacy decisions where applicable
- Other legally recognized transfer mechanisms

**5.3 EU/UK Users**
If you are in the EU or UK, we comply with GDPR requirements for international data transfers.
      `
    },
    {
      icon: Bell,
      title: "6. Your Rights & Choices",
      content: `
**6.1 Access & Portability**
- Request a copy of your personal data
- Export your content and data

**6.2 Correction**
- Update or correct inaccurate information
- Modify your profile and preferences

**6.3 Deletion**
- Request deletion of your account and data
- Note: Some data may be retained for legal compliance

**6.4 Opt-Out**
- Unsubscribe from marketing communications
- Disable personalized recommendations
- Manage cookie preferences

**6.5 Restriction**
- Request restriction of processing in certain circumstances

**6.6 Objection**
- Object to processing based on legitimate interests

**To exercise these rights, contact: privacy@legionlive.com**
      `
    },
    {
      icon: Trash2,
      title: "7. Data Retention",
      content: `
**7.1 Retention Periods**
- **Account Data**: Retained while your account is active, plus 30 days after deletion
- **Content**: Retained until you delete it or your account is closed
- **Transaction Records**: Retained for 7 years for tax and legal compliance
- **Security Logs**: Retained for 1 year
- **Analytics Data**: Aggregated and anonymized after 2 years

**7.2 Deletion Process**
When you request account deletion:
- Your profile becomes inaccessible immediately
- Personal data is deleted within 30 days
- Some data may be retained in backups for up to 90 days
- Anonymized data may be retained for analytics
      `
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-4 py-2 mb-4">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-200 text-sm">Privacy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Privacy Policy</h1>
          <p className="text-amber-400/70">Last updated: {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardContent className="p-6">
            <p className="text-amber-200/80 leading-relaxed">
              At Legion Live, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, share, and protect your personal information when you use our platform. By using Legion Live, 
              you agree to the collection and use of information in accordance with this policy.
            </p>
          </CardContent>
        </Card>

        {/* GDPR Notice */}
        <Card className="bg-blue-900/20 border-blue-500/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-blue-200 font-semibold mb-2">For EU/UK Residents (GDPR)</h3>
                <p className="text-blue-200/70 text-sm">
                  If you are located in the European Union or United Kingdom, you have additional rights under 
                  the General Data Protection Regulation (GDPR). Legion Live acts as the data controller for 
                  your personal information. You can contact our Data Protection Officer at dpo@legionlive.com.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-amber-200/70 leading-relaxed whitespace-pre-line">
                    {section.content.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-amber-200">{part}</strong> : part
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact */}
        <Card className="bg-stone-800/30 border-amber-600/20 mt-6">
          <CardContent className="p-6">
            <h3 className="text-amber-100 font-semibold mb-4">Contact Us</h3>
            <p className="text-amber-200/70 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="text-amber-200/70 space-y-2">
              <li>• Email: privacy@legionlive.com</li>
              <li>• Data Protection Officer: dpo@legionlive.com</li>
              <li>• Address: Legion Live Inc., 123 Stream Street, San Francisco, CA 94102</li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-amber-400/50 text-sm">
          <p>© 2026 Legion Live. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}