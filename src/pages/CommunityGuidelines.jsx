import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, Shield, AlertTriangle, Ban, MessageCircle, 
  Video, Users, Flag, Scale, CheckCircle, XCircle 
} from 'lucide-react';

export default function CommunityGuidelines() {
  const lastUpdated = "January 30, 2026";

  const principles = [
    {
      icon: Heart,
      title: "Respect & Kindness",
      description: "Treat everyone with respect. We're building a positive community where creators and viewers can thrive together."
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "Protect yourself and others. Never share personal information and report suspicious behavior."
    },
    {
      icon: Users,
      title: "Inclusivity",
      description: "Legion Live welcomes everyone regardless of race, ethnicity, gender, sexuality, religion, or background."
    },
    {
      icon: Scale,
      title: "Authenticity",
      description: "Be genuine. Don't impersonate others or misrepresent yourself."
    }
  ];

  const prohibitedContent = [
    { title: "Sexual Content & Nudity", description: "No explicit sexual content, nudity, or sexually suggestive material" },
    { title: "Violence & Gore", description: "No graphic violence, gore, or content promoting harm to self or others" },
    { title: "Harassment & Bullying", description: "No targeting, harassing, or bullying of any individual or group" },
    { title: "Hate Speech", description: "No content promoting hatred based on protected characteristics" },
    { title: "Illegal Activities", description: "No content depicting or promoting illegal activities" },
    { title: "Dangerous Acts", description: "No content showing dangerous stunts that could lead to injury" },
    { title: "Minor Safety", description: "No content that exploits or endangers minors in any way" },
    { title: "Spam & Scams", description: "No spam, phishing, or fraudulent schemes" },
    { title: "Misinformation", description: "No deliberately false or misleading information that could cause harm" },
    { title: "Copyright Violation", description: "No unauthorized use of copyrighted material" }
  ];

  const streamGuidelines = [
    { 
      allowed: true, 
      items: [
        "Gaming, music, art, and creative content",
        "Educational and informative streams",
        "Casual conversations and talk shows",
        "Fitness and wellness content",
        "Cooking and lifestyle content",
        "Collaborative streams with other creators"
      ]
    },
    { 
      allowed: false, 
      items: [
        "Streaming while impaired by substances",
        "Showing weapons in threatening contexts",
        "Broadcasting private locations without consent",
        "Gambling or betting activities",
        "Multi-level marketing promotions",
        "Sleeping streams longer than 8 hours"
      ]
    }
  ];

  const chatRules = [
    "Be respectful to the streamer and other viewers",
    "No spamming or excessive use of caps",
    "No promoting other channels without permission",
    "Follow the streamer's specific rules",
    "No begging for gifts or follows",
    "No sharing personal information",
    "No discriminatory language or slurs",
    "No discussing illegal activities"
  ];

  const consequences = [
    { level: "Warning", description: "First-time minor violations", color: "yellow" },
    { level: "24-Hour Ban", description: "Repeated minor violations or single moderate violation", color: "orange" },
    { level: "7-Day Ban", description: "Serious violations or pattern of moderate violations", color: "red" },
    { level: "Permanent Ban", description: "Severe violations or repeated serious offenses", color: "red" },
    { level: "Legal Action", description: "Criminal activity or threats of violence", color: "purple" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm">Community</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Community Guidelines</h1>
          <p className="text-amber-400/70">Last updated: {lastUpdated}</p>
        </div>

        {/* Introduction */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardContent className="p-6">
            <p className="text-amber-200/80 leading-relaxed">
              Legion Live is a community where creators and viewers come together to share experiences, 
              entertain, and connect. These guidelines help ensure everyone has a positive and safe 
              experience. Violations may result in content removal, account suspension, or permanent ban.
            </p>
          </CardContent>
        </Card>

        {/* Core Principles */}
        <h2 className="text-xl font-bold text-amber-100 mb-4">Our Core Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {principles.map((principle, index) => {
            const Icon = principle.icon;
            return (
              <Card key={index} className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-amber-100 font-semibold mb-1">{principle.title}</h3>
                    <p className="text-amber-200/60 text-sm">{principle.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Prohibited Content */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              Prohibited Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-200/70 mb-4">The following content is not allowed on Legion Live:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prohibitedContent.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-stone-900/50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-100 font-medium text-sm">{item.title}</h4>
                    <p className="text-amber-200/50 text-xs">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Streaming Guidelines */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-amber-400" />
              </div>
              Streaming Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Allowed
                </h4>
                <ul className="space-y-2">
                  {streamGuidelines[0].items.map((item, index) => (
                    <li key={index} className="text-amber-200/70 text-sm flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Not Allowed
                </h4>
                <ul className="space-y-2">
                  {streamGuidelines[1].items.map((item, index) => (
                    <li key={index} className="text-amber-200/70 text-sm flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Rules */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              Chat Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {chatRules.map((rule, index) => (
                <li key={index} className="text-amber-200/70 text-sm flex items-start gap-2 p-2 bg-stone-900/30 rounded">
                  <span className="text-amber-400">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Consequences */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              Enforcement & Consequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-200/70 mb-4">
              Violations of these guidelines will result in appropriate action based on severity:
            </p>
            <div className="space-y-3">
              {consequences.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-stone-900/50 rounded-lg">
                  <Badge className={`
                    ${item.color === 'yellow' ? 'bg-yellow-600/30 text-yellow-200 border-yellow-500/30' : ''}
                    ${item.color === 'orange' ? 'bg-orange-600/30 text-orange-200 border-orange-500/30' : ''}
                    ${item.color === 'red' ? 'bg-red-600/30 text-red-200 border-red-500/30' : ''}
                    ${item.color === 'purple' ? 'bg-purple-600/30 text-purple-200 border-purple-500/30' : ''}
                  `}>
                    {item.level}
                  </Badge>
                  <span className="text-amber-200/70 text-sm">{item.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reporting */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <Flag className="w-5 h-5 text-amber-400" />
              </div>
              Reporting Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-200/70 mb-4">
              If you see content or behavior that violates these guidelines:
            </p>
            <ul className="text-amber-200/70 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                Use the report button on streams, messages, or profiles
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                Provide specific details about the violation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                Include timestamps if reporting stream content
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">4.</span>
                Our moderation team reviews all reports within 24 hours
              </li>
            </ul>
            <p className="text-amber-200/50 text-sm mt-4">
              For urgent safety concerns, contact: safety@legionlive.com
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-amber-400/50 text-sm">
          <p>These guidelines may be updated periodically. Continued use of Legion Live constitutes acceptance of any changes.</p>
          <p className="mt-2">© 2026 Legion Live. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}