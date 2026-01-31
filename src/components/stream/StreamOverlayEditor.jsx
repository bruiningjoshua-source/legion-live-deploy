import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Layers, 
  Plus, 
  X, 
  Move,
  Type,
  Image,
  ShoppingBag,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  GripVertical,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const OVERLAY_TYPES = {
  text: { icon: Type, label: 'Text', color: 'bg-blue-500' },
  image: { icon: Image, label: 'Image', color: 'bg-green-500' },
  product: { icon: ShoppingBag, label: 'Product', color: 'bg-pink-500' },
  cta: { icon: LinkIcon, label: 'Call to Action', color: 'bg-amber-500' }
};

const POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'center-left', label: 'Center Left' },
  { id: 'center', label: 'Center' },
  { id: 'center-right', label: 'Center Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' }
];

export default function StreamOverlayEditor({ overlays = [], onUpdate, onClose }) {
  const [localOverlays, setLocalOverlays] = useState(overlays);
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [editingOverlay, setEditingOverlay] = useState(null);
  const [newOverlay, setNewOverlay] = useState({
    type: 'text',
    content: '',
    position: 'bottom-right',
    visible: true,
    link: '',
    style: {}
  });

  const addOverlay = () => {
    if (!newOverlay.content && newOverlay.type !== 'product') {
      toast.error('Please add content');
      return;
    }

    const overlay = {
      ...newOverlay,
      id: Date.now()
    };

    const updated = [...localOverlays, overlay];
    setLocalOverlays(updated);
    onUpdate?.(updated);
    setShowAddOverlay(false);
    setNewOverlay({ type: 'text', content: '', position: 'bottom-right', visible: true, link: '', style: {} });
    toast.success('Overlay added!');
  };

  const updateOverlay = (id, changes) => {
    const updated = localOverlays.map(o => o.id === id ? { ...o, ...changes } : o);
    setLocalOverlays(updated);
    onUpdate?.(updated);
  };

  const deleteOverlay = (id) => {
    const updated = localOverlays.filter(o => o.id !== id);
    setLocalOverlays(updated);
    onUpdate?.(updated);
    toast.success('Overlay removed');
  };

  const toggleVisibility = (id) => {
    const overlay = localOverlays.find(o => o.id === id);
    updateOverlay(id, { visible: !overlay?.visible });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-[#1a1a1c] border-l border-white/10 flex flex-col z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Stream Overlays</h3>
              <p className="text-white/50 text-xs">Add interactive elements</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overlays List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {localOverlays.map((overlay, i) => {
          const typeConfig = OVERLAY_TYPES[overlay.type];
          const Icon = typeConfig?.icon || Type;

          return (
            <motion.div
              key={overlay.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border bg-white/5 border-white/10 ${
                !overlay.visible ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${typeConfig?.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{typeConfig?.label}</p>
                    <p className="text-white/40 text-xs capitalize">{overlay.position.replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVisibility(overlay.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    {overlay.visible ? (
                      <Eye className="w-4 h-4 text-white/60" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-white/30" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingOverlay(overlay.id === editingOverlay ? null : overlay.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4 text-white/60" />
                  </button>
                  <button
                    onClick={() => deleteOverlay(overlay.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-black/30 rounded-lg p-3 mb-2">
                {overlay.type === 'text' && (
                  <p className="text-white text-sm">{overlay.content}</p>
                )}
                {overlay.type === 'image' && (
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-white/40" />
                    <span className="text-white/60 text-xs truncate">{overlay.content || 'Image URL'}</span>
                  </div>
                )}
                {overlay.type === 'product' && (
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-pink-400" />
                    <div>
                      <p className="text-white text-sm font-medium">{overlay.productName || 'Product'}</p>
                      <p className="text-emerald-400 text-xs">{overlay.productPrice || '$0.00'}</p>
                    </div>
                  </div>
                )}
                {overlay.type === 'cta' && (
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">{overlay.content}</span>
                    <ExternalLink className="w-4 h-4 text-amber-400" />
                  </div>
                )}
              </div>

              {/* Edit Section */}
              <AnimatePresence>
                {editingOverlay === overlay.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      {/* Content */}
                      <div>
                        <label className="text-white/60 text-xs mb-1 block">Content</label>
                        <Input
                          value={overlay.content}
                          onChange={(e) => updateOverlay(overlay.id, { content: e.target.value })}
                          className="bg-black/30 border-white/10 text-white text-sm"
                        />
                      </div>

                      {/* Position */}
                      <div>
                        <label className="text-white/60 text-xs mb-1 block">Position</label>
                        <select
                          value={overlay.position}
                          onChange={(e) => updateOverlay(overlay.id, { position: e.target.value })}
                          className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2"
                        >
                          {POSITIONS.map(pos => (
                            <option key={pos.id} value={pos.id}>{pos.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Link */}
                      {(overlay.type === 'cta' || overlay.type === 'product') && (
                        <div>
                          <label className="text-white/60 text-xs mb-1 block">Link URL</label>
                          <Input
                            value={overlay.link}
                            onChange={(e) => updateOverlay(overlay.id, { link: e.target.value })}
                            placeholder="https://"
                            className="bg-black/30 border-white/10 text-white text-sm"
                          />
                        </div>
                      )}

                      {/* Product specific */}
                      {overlay.type === 'product' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-white/60 text-xs mb-1 block">Name</label>
                            <Input
                              value={overlay.productName || ''}
                              onChange={(e) => updateOverlay(overlay.id, { productName: e.target.value })}
                              className="bg-black/30 border-white/10 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-white/60 text-xs mb-1 block">Price</label>
                            <Input
                              value={overlay.productPrice || ''}
                              onChange={(e) => updateOverlay(overlay.id, { productPrice: e.target.value })}
                              placeholder="$19.99"
                              className="bg-black/30 border-white/10 text-white text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {localOverlays.length === 0 && !showAddOverlay && (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-1">No overlays</p>
            <p className="text-white/30 text-sm">Add text, images, products, or CTAs</p>
          </div>
        )}

        {/* Add Overlay Form */}
        <AnimatePresence>
          {showAddOverlay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-medium mb-3">Add Overlay</h4>

                {/* Type Selection */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {Object.entries(OVERLAY_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewOverlay({ ...newOverlay, type: key })}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          newOverlay.type === key
                            ? `${config.color} border-white/30`
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${newOverlay.type === key ? 'text-white' : 'text-white/60'}`} />
                        <p className="text-white text-xs">{config.label}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Content */}
                <div className="mb-3">
                  <label className="text-white/60 text-xs mb-1 block">
                    {newOverlay.type === 'text' ? 'Text' : 
                     newOverlay.type === 'image' ? 'Image URL' :
                     newOverlay.type === 'cta' ? 'Button Text' : 'Product Image URL'}
                  </label>
                  <Input
                    value={newOverlay.content}
                    onChange={(e) => setNewOverlay({ ...newOverlay, content: e.target.value })}
                    placeholder={newOverlay.type === 'text' ? 'Enter text...' : 'https://...'}
                    className="bg-black/30 border-white/10 text-white text-sm"
                  />
                </div>

                {/* Product fields */}
                {newOverlay.type === 'product' && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-white/60 text-xs mb-1 block">Product Name</label>
                      <Input
                        value={newOverlay.productName || ''}
                        onChange={(e) => setNewOverlay({ ...newOverlay, productName: e.target.value })}
                        className="bg-black/30 border-white/10 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs mb-1 block">Price</label>
                      <Input
                        value={newOverlay.productPrice || ''}
                        onChange={(e) => setNewOverlay({ ...newOverlay, productPrice: e.target.value })}
                        placeholder="$19.99"
                        className="bg-black/30 border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Link */}
                {(newOverlay.type === 'cta' || newOverlay.type === 'product') && (
                  <div className="mb-3">
                    <label className="text-white/60 text-xs mb-1 block">Link URL</label>
                    <Input
                      value={newOverlay.link}
                      onChange={(e) => setNewOverlay({ ...newOverlay, link: e.target.value })}
                      placeholder="https://"
                      className="bg-black/30 border-white/10 text-white text-sm"
                    />
                  </div>
                )}

                {/* Position */}
                <div className="mb-4">
                  <label className="text-white/60 text-xs mb-1 block">Position</label>
                  <select
                    value={newOverlay.position}
                    onChange={(e) => setNewOverlay({ ...newOverlay, position: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-lg px-3 py-2"
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddOverlay(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addOverlay}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Button */}
      {!showAddOverlay && (
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={() => setShowAddOverlay(true)}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Overlay
          </Button>
        </div>
      )}
    </motion.div>
  );
}