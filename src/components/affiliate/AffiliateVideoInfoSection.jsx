import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ExternalLink, 
  Copy, 
  Check,
  Tag,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateVideoInfoSection({ video }) {
  const [copiedCode, setCopiedCode] = React.useState(false);

  const copyPromoCode = () => {
    if (video.promo_code) {
      navigator.clipboard.writeText(video.promo_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Promo code copied!');
    }
  };

  const infoSection = video.info_section || {};
  const hasContent = infoSection.custom_header || infoSection.about_product || 
                     infoSection.key_features?.length > 0 || video.promo_code || video.product_link;

  if (!hasContent) return null;

  return (
    <Card className="bg-stone-800/30 border-amber-600/20 mt-4">
      <CardContent className="p-4 space-y-4">
        {/* Custom Header */}
        {infoSection.custom_header && (
          <h3 className="text-amber-100 font-bold text-lg border-b border-amber-600/20 pb-2">
            {infoSection.custom_header}
          </h3>
        )}

        {/* Product Info */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
            {video.brand_name}
          </Badge>
          {video.product_type && (
            <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
              {video.product_type.replace('_', ' ')}
            </Badge>
          )}
          {video.category && (
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
              {video.category}
            </Badge>
          )}
          {video.price_usd > 0 && (
            <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
              ${video.price_usd}
            </Badge>
          )}
        </div>

        {/* About Product */}
        {infoSection.about_product && (
          <div>
            <p className="text-amber-400/70 text-xs mb-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> About
            </p>
            <p className="text-amber-100 text-sm">{infoSection.about_product}</p>
          </div>
        )}

        {/* Key Features */}
        {infoSection.key_features?.length > 0 && (
          <div>
            <p className="text-amber-400/70 text-xs mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Key Features
            </p>
            <ul className="space-y-1">
              {infoSection.key_features.map((feature, i) => (
                <li key={i} className="text-amber-100 text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interests/Tags */}
        {video.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {video.interests.map((interest, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-stone-700/50 rounded-full text-amber-300">
                #{interest}
              </span>
            ))}
          </div>
        )}

        {/* Promo Code & Link */}
        {(video.promo_code || video.product_link) && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-amber-600/20">
            {video.promo_code && (
              <div className="flex-1">
                <p className="text-amber-400/70 text-xs mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Promo Code
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-green-900/30 border border-green-600/30 px-3 py-2 rounded-lg text-green-300 font-mono text-sm">
                    {video.promo_code}
                  </code>
                  <Button onClick={copyPromoCode} size="sm" className="bg-green-600 hover:bg-green-700">
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {video.discount_info && (
                  <p className="text-green-400 text-xs mt-1">{video.discount_info}</p>
                )}
              </div>
            )}
            
            {video.product_link && (
              <div className="flex-1">
                <p className="text-amber-400/70 text-xs mb-1">Shop Now</p>
                <a
                  href={video.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Visit Product
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Affiliate Disclosure */}
        {infoSection.affiliate_disclosure && (
          <div className="pt-2 border-t border-amber-600/20">
            <p className="text-amber-400/50 text-xs flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {infoSection.affiliate_disclosure}
            </p>
          </div>
        )}

        {/* Contact Info */}
        {infoSection.contact_info && (
          <p className="text-amber-400/60 text-xs">{infoSection.contact_info}</p>
        )}
      </CardContent>
    </Card>
  );
}