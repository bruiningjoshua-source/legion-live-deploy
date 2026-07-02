import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  MousePointerClick, 
  ShoppingBag,
  Plus,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AffiliateDashboard() {
  const queryClient = useQueryClient();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    affiliate_link: '',
    commission_rate: 10,
    price: 0,
    category: '',
    product_image_url: ''
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: products = [] } = useQuery({
    queryKey: ['affiliate-products', creator?.id],
    queryFn: () => base44.entities.AffiliateProduct.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  const totalEarnings = products.reduce((sum, p) => sum + (p.total_earnings || 0), 0);
  const totalClicks = products.reduce((sum, p) => sum + (p.click_count || 0), 0);
  const totalConversions = products.reduce((sum, p) => sum + (p.conversion_count || 0), 0);
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;

  const addProductMutation = useMutation({
    mutationFn: (data) => base44.entities.AffiliateProduct.create({
      ...data,
      creator_id: creator.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      setShowAddProduct(false);
      setFormData({
        product_name: '',
        description: '',
        affiliate_link: '',
        commission_rate: 10,
        price: 0,
        category: '',
        product_image_url: ''
      });
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, product_image_url: result.file_url });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 mb-2 flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-amber-400" />
              Affiliate Marketing Dashboard
            </h1>
            <p className="text-amber-400/70">Manage your products and track earnings in real-time</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('BrandCampaigns')}>
              <Button variant="outline" className="border-amber-600/30 text-amber-300 hover:bg-amber-800/20">
                Brand Campaigns
              </Button>
            </Link>
            <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
              <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-amber-600/30 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Add Affiliate Product</DialogTitle>
              </DialogHeader>
                <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-amber-200">Product Name</Label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-amber-200">Price ($)</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-amber-200">Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                      className="bg-stone-800 border-amber-600/20 text-amber-100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Affiliate Link</Label>
                  <Input
                    value={formData.affiliate_link}
                    onChange={(e) => setFormData({ ...formData, affiliate_link: e.target.value })}
                    placeholder="https://..."
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-amber-200">Product Image</Label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="text-amber-200" />
                </div>
                <Button
                  onClick={() => addProductMutation.mutate(formData)}
                  disabled={!formData.product_name || !formData.affiliate_link}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Add Product
                </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Earnings</p>
                  <p className="text-3xl font-bold text-amber-100">${totalEarnings.toFixed(2)}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Clicks</p>
                  <p className="text-3xl font-bold text-amber-100">{totalClicks}</p>
                </div>
                <MousePointerClick className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Conversions</p>
                  <p className="text-3xl font-bold text-amber-100">{totalConversions}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold text-amber-100">{conversionRate}%</p>
                </div>
                <BarChart3 className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100">Your Affiliate Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.25 }}
                  className="bg-stone-900/50 rounded-xl p-4 border border-amber-600/20"
                >
                  {product.product_image_url && (
                    <img src={product.product_image_url} className="w-full h-40 object-cover rounded-lg mb-4" alt={product.product_name} />
                  )}
                  <h3 className="text-amber-100 font-bold text-lg mb-2">{product.product_name}</h3>
                  <p className="text-amber-400/70 text-sm mb-4 line-clamp-2">{product.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                      ${product.price}
                    </Badge>
                    <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30">
                      {product.commission_rate}% commission
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div>
                      <p className="text-xs text-amber-400/70">Clicks</p>
                      <p className="text-lg font-bold text-amber-100">{product.click_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-400/70">Sales</p>
                      <p className="text-lg font-bold text-amber-100">{product.conversion_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-400/70">Earned</p>
                      <p className="text-lg font-bold text-green-400">${product.total_earnings?.toFixed(2) || 0}</p>
                    </div>
                  </div>

                  <a 
                    href={product.affiliate_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    View Product
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}