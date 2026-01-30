import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Users, CreditCard, AlertTriangle, Scale } from 'lucide-react';

export default function TermsOfService() {
  const lastUpdated = "January 30, 2026";
  
  const sections = [
    {
      icon: Users,
      title: "1. Account Terms",
      content: `
**1.1 Eligibility**
You must be at least 18 years old to create an account and use Legion Live. By creating an account, you represent and warrant that you meet this age requirement.

**1.2 Account Responsibility**
- You are responsible for maintaining the security of your account credentials
- You must not share your account with others
- You are responsible for all activities that occur under your account
- You must notify us immediately of any unauthorized use

**1.3 Account Termination**
We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or harm the community.
      `
    },
    {
      icon: FileText,
      title: "2. Content Guidelines",
      content: `
**2.1 Prohibited Content**
The following content is strictly prohibited:
- Nudity, sexual content, or sexually suggestive material
- Violence, gore, or content promoting harm
- Harassment, bullying, or hate speech
- Illegal activities or content promoting illegal acts
- Copyrighted material without permission
- Spam, scams, or misleading content
- Content involving minors in inappropriate contexts

**2.2 Content Ownership**
- You retain ownership of content you create
- By posting content, you grant Legion Live a license to display, distribute, and promote your content
- We may remove content that violates our guidelines without notice

**2.3 DMCA Compliance**
We comply with the Digital Millennium Copyright Act. Copyright holders may submit takedown notices for infringing content.
      `
    },
    {
      icon: CreditCard,
      title: "3. Payments & Monetization",
      content: `
**3.1 Virtual Currency**
- Legion Live uses virtual currencies (Denarii, Sestertii, As) for in-app transactions
- Virtual currency has no real-world value and cannot be exchanged for cash
- Purchases of virtual currency are final and non-refundable except as required by law

**3.2 Creator Earnings**
- Creators earn a percentage of virtual gifts received during streams
- Earnings are subject to applicable taxes and fees
- Minimum payout thresholds apply
- We reserve the right to withhold payouts for suspected fraud

**3.3 Subscriptions**
- Creator subscriptions are billed according to the selected plan
- Cancellations take effect at the end of the billing period
- Refunds are handled on a case-by-case basis

**3.4 Chargebacks & Fraud**
- Fraudulent chargebacks may result in account termination
- We cooperate with payment processors to investigate fraud
      `
    },
    {
      icon: Shield,
      title: "4. Privacy & Data",
      content: `
**4.1 Data Collection**
We collect data as described in our Privacy Policy, including:
- Account information
- Usage data and analytics
- Payment information
- Content you create

**4.2 Data Use**
Your data is used to:
- Provide and improve our services
- Process payments
- Communicate with you
- Enforce our terms and policies

**4.3 Data Protection**
We implement industry-standard security measures to protect your data. See our Privacy Policy for details.
      `
    },
    {
      icon: AlertTriangle,
      title: "5. Disclaimers & Limitations",
      content: `
**5.1 Service Availability**
- We strive for high availability but do not guarantee uninterrupted service
- We may modify or discontinue features at any time
- Scheduled maintenance may temporarily affect access

**5.2 Limitation of Liability**
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
- Legion Live is provided "as is" without warranties
- We are not liable for indirect, incidental, or consequential damages
- Our total liability is limited to the amount you paid us in the past 12 months

**5.3 Indemnification**
You agree to indemnify and hold harmless Legion Live from claims arising from your use of the service or violation of these terms.
      `
    },
    {
      icon: Scale,
      title: "6. Dispute Resolution",
      content: `
**6.1 Governing Law**
These terms are governed by the laws of the State of Delaware, USA.

**6.2 Arbitration**
Any disputes will be resolved through binding arbitration rather than court, except for claims that qualify for small claims court.

**6.3 Class Action Waiver**
You agree to resolve disputes individually and waive the right to participate in class actions.

**6.4 Contact**
For questions about these terms, contact: legal@legionlive.com
      `
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 text-sm">Legal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Terms of Service</h1>
          <p className="text-amber-400/70">Last updated: {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardContent className="p-6">
            <p className="text-amber-200/80 leading-relaxed">
              Welcome to Legion Live. By accessing or using our platform, you agree to be bound by these 
              Terms of Service. Please read them carefully before using our services. If you do not agree 
              to these terms, you may not use Legion Live.
            </p>
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
                  <div className="text-amber-200/70 leading-relaxed whitespace-pre-line prose prose-invert prose-amber max-w-none">
                    {section.content.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-amber-200">{part}</strong> : part
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-amber-400/50 text-sm">
          <p>By using Legion Live, you acknowledge that you have read and agree to these Terms of Service.</p>
          <p className="mt-2">© 2026 Legion Live. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}