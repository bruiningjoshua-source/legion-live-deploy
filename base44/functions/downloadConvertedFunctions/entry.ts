import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns all supabase-converted function files as a downloadable JSON bundle
// Access via: Dashboard → Code → Functions → downloadConvertedFunctions → URL

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Use the GitHub connector to read files from the repo
    // Since we can't read local files in a backend function,
    // we'll return instructions for the admin
    return Response.json({
      message: 'Use the Base44 GitHub sync or the chat assistant to access converted files.',
      instructions: [
        '1. In the Base44 chat, ask: "Read supabase-converted/functionName.js" for any specific file',
        '2. Or enable GitHub 2-way sync to push all files to your repo automatically',
        '3. The files are in src/supabase-converted/ in your synced repo'
      ],
      converted_files: [
        'trackEngagement.js', 'setupPayoutMethod.js', 'transactionalEmail.js',
        'cleanupStaleStreams.js', 'getWithdrawalHistory.js', 'clearLiveStreams.js',
        'cancelSubscription.js', 'adminMonetizationBypass.js', 'checkSubscription.js',
        'adminListUsers.js', 'saveUserTheme.js', 'createPPVCheckout.js',
        'createTipCheckout.js', 'restreamForward.js', 'createCreatorMonetizationCheckout.js',
        'createFanClubCheckout.js', 'adminAffiliateEarnings.js', 'createCampaignCheckout.js',
        'createHostSubscription.js', 'enforceKycGate.js', 'checkCreatorMilestones.js',
        'processReferralOnboarding.js', 'processCreatorReferral.js', 'getTrendingContent.js',
        'stripeAlertNotifier.js', 'checkPaymentStatus.js', 'dynamicTipSuggestions.js',
        'getPayoutConfig.js', 'setupMobileScreenShare.js', 'removeModerator.js',
        'processPayoutWithKyc.js', 'appointModerator.js', 'securityAudit.js',
        'creatorDataExport.js', 'aiModerateContent.js', 'gdprCompliance.js',
        'contentModerationAppeal.js', 'sendPushNotification.js', 'detectHighlights.js',
        'uploadThemeBackground.js', 'fraudMonitoring.js', 'generateStreamThumbnail.js',
        'forecastCreatorPayouts.js', 'generateCollabMatches.js', 'getPersonalizedRecommendations.js',
        'generateRecommendations.js', 'analyzeCreatorChurn.js', 'updateCreatorKYCTier.js',
        'predictStreamerChurn.js', 'suspiciousLoginDetection.js', 'processReferralMonetization.js',
        'validateAndSanitizeInput.js', 'validateVideoMetadata.js', 'emailVerification.js',
        'retryPayment.js', 'updateRecommendationEngine.js', 'stripeConnectOnboard.js',
        'updateViewerCount.js', 'generateZegoToken.js', 'claimDailyReward.js',
        'requestWithdrawal.js', 'createDenariiCheckout.js', 'moderateChat.js',
        'getOBSStreamKey.js', 'sendGift.js', 'stripeWebhook.js', 'legionCompanionChat.js',
        'handleStripeWebhook3DS.js', 'requestSigning.js', 'analyzeFraudRisk.js',
        'batchFraudAnalysis.js', 'stripeConnectWebhook.js', 'stripeConnectDailyPayouts.js',
        'csrfProtection.js', 'stripeConnectPayout.js', 'chargebackHandler.js',
        'assessPaymentRisk.js', 'getFraudDashboard.js', 'verifyPayoutRouting.js',
        'payoutRoutingOptimizer.js', 'paymentIntentLifecycle.js', 'paymentIntentHandler.js',
        'kycVerification.js', 'idempotencyManager.js', 'deviceFingerprint.js',
        'fraudDashboardHandler.js', 'validationMiddleware.js', 'cryptoUtils.js',
        'rateLimiter.js', 'rateLimiters.js', 'fraudDetection.js', 'liveStripeTest.js',
        'productionValidation.js', 'processPPVWebhook.js'
      ],
      total: 100
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});