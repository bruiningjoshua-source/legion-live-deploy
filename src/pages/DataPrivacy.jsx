import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Download, Trash2, Shield, Eye, Bell, BarChart3, 
  AlertTriangle, Check, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

export default function DataPrivacy() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Consent settings
  const [consents, setConsents] = useState({
    marketing: user?.consent_marketing !== false,
    analytics: user?.consent_analytics !== false,
    personalization: user?.consent_personalization !== false
  });

  // Update consent
  const updateConsentMutation = useMutation({
    mutationFn: async ({ type, value }) => {
      await base44.functions.invoke('gdprCompliance', {
        action: value ? 'grant_consent' : 'withdraw_consent',
        consentType: type
      });
      await base44.auth.updateMe({
        [`consent_${type}`]: value,
        consent_updated_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast.success('Privacy preferences updated');
      refetchUser();
    },
    onError: (error) => {
      toast.error('Failed to update preferences: ' + error.message);
    }
  });

  // Export data
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const response = await base44.functions.invoke('gdprCompliance', {
        action: 'export_data'
      });
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legion-live-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Your data has been exported');
    } catch (error) {
      toast.error('Failed to export data: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Request deletion
  const handleDeleteAccount = async () => {
    try {
      await base44.functions.invoke('gdprCompliance', {
        action: 'request_deletion'
      });
      toast.success('Deletion request submitted. You will receive a confirmation email.');
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to request deletion: ' + error.message);
    }
  };

  const handleConsentChange = (type, value) => {
    setConsents(prev => ({ ...prev, [type]: value }));
    updateConsentMutation.mutate({ type, value });
  };

  return (
    <div className="min-h-screen bg-[#050508] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-500/30 rounded-full px-4 py-2 mb-4">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-green-200 text-sm">Privacy Settings</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-100 mb-2">Your Data & Privacy</h1>
          <p className="text-amber-400/70">Manage your data and privacy preferences</p>
        </div>

        {/* Privacy Controls */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" />
              Privacy Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Marketing Emails */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <Label className="text-amber-100">Marketing Emails</Label>
                  <p className="text-amber-400/60 text-sm">Receive updates, promotions, and news</p>
                </div>
              </div>
              <Switch
                checked={consents.marketing}
                onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
              />
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <Label className="text-amber-100">Analytics & Improvements</Label>
                  <p className="text-amber-400/60 text-sm">Help us improve with usage data</p>
                </div>
              </div>
              <Switch
                checked={consents.analytics}
                onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
              />
            </div>

            {/* Personalization */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <Label className="text-amber-100">Personalized Content</Label>
                  <p className="text-amber-400/60 text-sm">See recommendations based on your activity</p>
                </div>
              </div>
              <Switch
                checked={consents.personalization}
                onCheckedChange={(checked) => handleConsentChange('personalization', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="bg-stone-800/30 border-amber-600/20 mb-6">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-amber-400" />
              Export Your Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-200/70 mb-4">
              Download a copy of all your personal data in JSON format. This includes your profile, 
              content, messages, and activity history.
            </p>
            <Button 
              onClick={handleExportData}
              disabled={exportLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download My Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="bg-red-900/20 border-red-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-red-200 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-200/70 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <ul className="text-red-200/60 text-sm mb-4 space-y-1">
              <li>• Your profile will be permanently removed</li>
              <li>• Your content will be deleted or anonymized</li>
              <li>• Your wallet balance will be forfeited</li>
              <li>• Financial records are kept for 7 years (legal requirement)</li>
            </ul>
            <Button 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </CardContent>
        </Card>

        {/* GDPR Info */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-amber-100 font-semibold mb-2">Your Rights Under GDPR</h3>
                <p className="text-amber-200/60 text-sm mb-3">
                  If you're in the EU/UK, you have the following rights:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge variant="outline" className="text-amber-200 border-amber-600/30 justify-start">
                    <Check className="w-3 h-3 mr-1" /> Right to Access
                  </Badge>
                  <Badge variant="outline" className="text-amber-200 border-amber-600/30 justify-start">
                    <Check className="w-3 h-3 mr-1" /> Right to Erasure
                  </Badge>
                  <Badge variant="outline" className="text-amber-200 border-amber-600/30 justify-start">
                    <Check className="w-3 h-3 mr-1" /> Right to Portability
                  </Badge>
                  <Badge variant="outline" className="text-amber-200 border-amber-600/30 justify-start">
                    <Check className="w-3 h-3 mr-1" /> Right to Object
                  </Badge>
                </div>
                <p className="text-amber-400/50 text-xs mt-3">
                  Contact our DPO: dpo@legionlive.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-stone-900 border-red-500/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Delete Your Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-amber-200/70">
                This will permanently delete your account and all your data. 
                This action cannot be undone. You will receive a confirmation email.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-stone-800 text-amber-100 border-amber-600/30 hover:bg-stone-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}