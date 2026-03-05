import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteAccountModal({ open, onOpenChange, userEmail, onConfirm }) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-stone-900 border-red-600/30 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <AlertDialogTitle className="text-red-300 text-lg">
              Delete Account
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-white/70 text-sm space-y-3">
            <p>This action is <strong className="text-red-400">permanent and irreversible</strong>. Deleting your account will:</p>
            <ul className="list-disc ml-5 space-y-1 text-white/60">
              <li>Remove your profile, streams, and all uploaded content</li>
              <li>Delete your wallet balance and transaction history</li>
              <li>Cancel all active subscriptions</li>
              <li>Remove your followers and following lists</li>
              <li>Erase all chat messages and community posts</li>
            </ul>
            <p className="text-white/50">
              Account: <span className="text-amber-300">{userEmail}</span>
            </p>
            <div className="pt-2">
              <p className="text-white/70 mb-2">Type <strong className="text-red-400">DELETE</strong> to confirm:</p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="bg-stone-800/50 border-red-600/30 text-white placeholder:text-white/30 focus:border-red-500"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="bg-stone-800 border-white/10 text-white hover:bg-stone-700">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {isDeleting ? 'Deleting...' : 'Delete My Account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}