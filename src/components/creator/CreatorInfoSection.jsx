import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


import { 
  Link as LinkIcon,
  ExternalLink,
  Edit,
  Save,
  Plus,
  Trash2,
  Store,
  Sparkles,
  Tag,
  Package,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function CreatorInfoSection({ creator, isOwnProfile }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);
  
  const [infoData, setInfoData] = useState({
    affiliate_links: creator?.affiliate_links || [],
    brand_partnerships: creator?.brand_partnerships || [],
    promo_codes: creator?.promo_codes || [],
    bio_extended: creator?.bio_extended || ''
  });

  const [newAffiliate, setNewAffiliate] = useState({ name: '', url: '', description: '' });
  const [newBrand, setNewBrand] = useState({ name: '', logo_url: '', description: '', website: '' });
  const [newPromo, setNewPromo] = useState({ brand: '', code: '', description: '', discount: '' });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Creator.update(creator.id, infoData),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-creator']);
      queryClient.invalidateQueries(['creator']);
      setIsEditing(false);
      toast.success('Info section updated!');
    }
  });

  const addAffiliate = () => {
    if (newAffiliate.name && newAffiliate.url) {
      setInfoData({
        ...infoData,
        affiliate_links: [...infoData.affiliate_links, { ...newAffiliate, id: Date.now() }]
      });
      setNewAffiliate({ name: '', url: '', description: '' });
    }
  };

  const addBrand = () => {
    if (newBrand.name) {
      setInfoData({
        ...infoData,
        brand_partnerships: [...infoData.brand_partnerships, { ...newBrand, id: Date.now() }]
      });
      setNewBrand({ name: '', logo_url: '', description: '', website: '' });
    }
  };

  const addPromo = () => {
    if (newPromo.brand && newPromo.code) {
      setInfoData({
        ...infoData,
        promo_codes: [...infoData.promo_codes, { ...newPromo, id: Date.now() }]
      });
      setNewPromo({ brand: '', code: '', description: '', discount: '' });
    }
  };

  const removeItem = (type, id) => {
    setInfoData({
      ...infoData,
      [type]: infoData[type].filter(item => item.id !== id)
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
    toast.success('Code copied!');
  };

  const hasContent = 
    (creator?.affiliate_links?.length > 0) || 
    (creator?.brand_partnerships?.length > 0) || 
    (creator?.promo_codes?.length > 0) ||
    creator?.bio_extended;

  // Viewer view
  if (!isOwnProfile) {
    if (!hasContent) return null;
    
    return (
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Creator Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Extended Bio */}
          {creator?.bio_extended && (
            <div>
              <p className="text-amber-100/90 whitespace-pre-wrap">{creator.bio_extended}</p>
            </div>
          )}

          {/* Affiliate Links */}
          {creator?.affiliate_links?.length > 0 && (
            <div>
              <h4 className="text-amber-200 font-semibold mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Affiliate Links
              </h4>
              <div className="space-y-2">
                {creator.affiliate_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg border border-amber-600/20 hover:border-amber-500/50 transition-colors group"
                  >
                    <div>
                      <p className="text-amber-100 font-medium">{link.name}</p>
                      {link.description && (
                        <p className="text-amber-400/60 text-sm">{link.description}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Promo Codes */}
          {creator?.promo_codes?.length > 0 && (
            <div>
              <h4 className="text-amber-200 font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Promo Codes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creator.promo_codes.map((promo, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gradient-to-br from-amber-900/30 to-stone-900 rounded-xl border border-amber-600/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-300 font-semibold">{promo.brand}</span>
                      {promo.discount && (
                        <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                          {promo.discount}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-stone-900/80 px-3 py-2 rounded-lg text-amber-100 font-mono text-sm">
                        {promo.code}
                      </code>
                      <Button
                        onClick={() => copyCode(promo.code)}
                        size="sm"
                        variant="outline"
                        className="border-amber-600/30 text-amber-300"
                      >
                        {copiedLink === promo.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    {promo.description && (
                      <p className="text-amber-400/60 text-xs mt-2">{promo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brand Partnerships */}
          {creator?.brand_partnerships?.length > 0 && (
            <div>
              <h4 className="text-amber-200 font-semibold mb-3 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Brand Partners
              </h4>
              <div className="flex flex-wrap gap-3">
                {creator.brand_partnerships.map((brand, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-stone-900/50 rounded-lg border border-amber-600/20"
                  >
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-amber-100 font-medium">{brand.name}</p>
                      {brand.description && (
                        <p className="text-amber-400/60 text-xs">{brand.description}</p>
                      )}
                    </div>
                    {brand.website && (
                      <a href={brand.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-amber-400 hover:text-amber-300" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Owner view - edit mode
  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader>
        <CardTitle className="text-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Creator Info Section
          </div>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-amber-600/30 text-amber-300"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          <>
            {/* Extended Bio */}
            <div>
              <Label className="text-amber-200">Extended Bio / About</Label>
              <Textarea
                value={infoData.bio_extended}
                onChange={(e) => setInfoData({ ...infoData, bio_extended: e.target.value })}
                placeholder="Share more about yourself, your content, or anything you want viewers to know..."
                className="mt-2 bg-stone-900 border-amber-600/20 text-amber-100 min-h-[100px]"
              />
            </div>

            {/* Affiliate Links */}
            <div>
              <Label className="text-amber-200 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Affiliate Links
              </Label>
              <div className="space-y-2 mt-2">
                {infoData.affiliate_links.map((link, i) => (
                  <div key={link.id || i} className="flex items-center gap-2 p-2 bg-stone-900/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-amber-100 text-sm font-medium">{link.name}</p>
                      <p className="text-amber-400/60 text-xs truncate">{link.url}</p>
                    </div>
                    <Button
                      onClick={() => removeItem('affiliate_links', link.id)}
                      size="icon"
                      variant="ghost"
                      className="text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Link name"
                    value={newAffiliate.name}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Input
                    placeholder="URL"
                    value={newAffiliate.url}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, url: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Button onClick={addAffiliate} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Promo Codes */}
            <div>
              <Label className="text-amber-200 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Promo Codes
              </Label>
              <div className="space-y-2 mt-2">
                {infoData.promo_codes.map((promo, i) => (
                  <div key={promo.id || i} className="flex items-center gap-2 p-2 bg-stone-900/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-amber-100 text-sm font-medium">{promo.brand}: <code className="bg-stone-800 px-2 py-0.5 rounded">{promo.code}</code></p>
                      {promo.discount && <Badge className="bg-green-600/20 text-green-300 text-xs ml-2">{promo.discount}</Badge>}
                    </div>
                    <Button
                      onClick={() => removeItem('promo_codes', promo.id)}
                      size="icon"
                      variant="ghost"
                      className="text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input
                    placeholder="Brand name"
                    value={newPromo.brand}
                    onChange={(e) => setNewPromo({ ...newPromo, brand: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Input
                    placeholder="Code"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Input
                    placeholder="Discount (e.g. 20% OFF)"
                    value={newPromo.discount}
                    onChange={(e) => setNewPromo({ ...newPromo, discount: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Button onClick={addPromo} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Brand Partnerships */}
            <div>
              <Label className="text-amber-200 flex items-center gap-2">
                <Store className="w-4 h-4" />
                Brand Partnerships
              </Label>
              <div className="space-y-2 mt-2">
                {infoData.brand_partnerships.map((brand, i) => (
                  <div key={brand.id || i} className="flex items-center gap-2 p-2 bg-stone-900/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-amber-100 text-sm font-medium">{brand.name}</p>
                      {brand.description && <p className="text-amber-400/60 text-xs">{brand.description}</p>}
                    </div>
                    <Button
                      onClick={() => removeItem('brand_partnerships', brand.id)}
                      size="icon"
                      variant="ghost"
                      className="text-red-400 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Brand name"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Input
                    placeholder="Website URL (optional)"
                    value={newBrand.website}
                    onChange={(e) => setNewBrand({ ...newBrand, website: e.target.value })}
                    className="bg-stone-900 border-amber-600/20 text-amber-100"
                  />
                  <Button onClick={addBrand} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Brand
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {hasContent ? (
              <div className="space-y-4">
                {creator?.bio_extended && (
                  <p className="text-amber-100/90">{creator.bio_extended}</p>
                )}
                {creator?.affiliate_links?.length > 0 && (
                  <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                    <LinkIcon className="w-4 h-4" />
                    {creator.affiliate_links.length} affiliate link(s)
                  </div>
                )}
                {creator?.promo_codes?.length > 0 && (
                  <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                    <Tag className="w-4 h-4" />
                    {creator.promo_codes.length} promo code(s)
                  </div>
                )}
                {creator?.brand_partnerships?.length > 0 && (
                  <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                    <Store className="w-4 h-4" />
                    {creator.brand_partnerships.length} brand partner(s)
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Sparkles className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
                <p className="text-amber-400/70 mb-3">Add affiliate links, promo codes, and brand info for your viewers</p>
                <Button onClick={() => setIsEditing(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Info
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}