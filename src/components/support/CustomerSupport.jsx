import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  MessageCircle, Send, HelpCircle, FileText, CreditCard, 
  Shield, AlertTriangle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const TICKET_CATEGORIES = [
  { value: 'billing', label: 'Billing & Payments', icon: CreditCard },
  { value: 'account', label: 'Account Issues', icon: Shield },
  { value: 'technical', label: 'Technical Support', icon: HelpCircle },
  { value: 'report', label: 'Report User/Content', icon: AlertTriangle },
  { value: 'creator', label: 'Creator Support', icon: FileText },
  { value: 'other', label: 'Other', icon: MessageCircle }
];

const TICKET_STATUS = {
  open: { label: 'Open', color: 'bg-blue-600' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-600' },
  waiting_response: { label: 'Awaiting Response', color: 'bg-purple-600' },
  resolved: { label: 'Resolved', color: 'bg-green-600' },
  closed: { label: 'Closed', color: 'bg-gray-600' }
};

export default function CustomerSupport({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'tickets'
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    category: '',
    subject: '',
    description: '',
    attachments: []
  });
  const [replyText, setReplyText] = useState('');

  const queryClient = useQueryClient();

  // Fetch user's tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets', user?.email],
    queryFn: async () => {
      const results = await base44.entities.PlatformAnalytics.filter(
        { metric_type: 'support_ticket', 'metadata.user_email': user?.email },
        '-created_date',
        50
      );
      return results;
    },
    enabled: !!user?.email
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      const ticket = await base44.entities.PlatformAnalytics.create({
        metric_type: 'support_ticket',
        metric_name: ticketData.category,
        metric_value: 1,
        metadata: {
          ticket_id: `TKT-${Date.now()}`,
          user_email: user.email,
          user_name: user.full_name,
          subject: ticketData.subject,
          description: ticketData.description,
          status: 'open',
          priority: 'normal',
          messages: [{
            from: 'user',
            content: ticketData.description,
            timestamp: new Date().toISOString()
          }],
          created_at: new Date().toISOString()
        }
      });
      return ticket;
    },
    onSuccess: () => {
      toast.success('Support ticket created! We\'ll respond within 24 hours.');
      setNewTicket({ category: '', subject: '', description: '', attachments: [] });
      setActiveTab('tickets');
      queryClient.invalidateQueries(['support-tickets']);
    },
    onError: (error) => {
      toast.error('Failed to create ticket: ' + error.message);
    }
  });

  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const ticket = tickets.find(t => t.id === ticketId);
      const messages = ticket.metadata.messages || [];
      messages.push({
        from: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      await base44.entities.PlatformAnalytics.update(ticketId, {
        metadata: {
          ...ticket.metadata,
          messages,
          status: 'open',
          updated_at: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast.success('Reply sent!');
      setReplyText('');
      queryClient.invalidateQueries(['support-tickets']);
    }
  });

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!newTicket.category || !newTicket.subject || !newTicket.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    createTicketMutation.mutate(newTicket);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    addReplyMutation.mutate({ ticketId: selectedTicket.id, message: replyText });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-600/20"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-stone-900 border-amber-600/30 w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-amber-100 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-400" />
            Support Center
          </SheetTitle>
        </SheetHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 mb-4">
          <Button
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setActiveTab('new'); setSelectedTicket(null); }}
            className={activeTab === 'new' ? 'bg-amber-600' : 'text-amber-200'}
          >
            New Ticket
          </Button>
          <Button
            variant={activeTab === 'tickets' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('tickets')}
            className={activeTab === 'tickets' ? 'bg-amber-600' : 'text-amber-200'}
          >
            My Tickets ({tickets.length})
          </Button>
        </div>

        {/* New Ticket Form */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="text-amber-200 text-sm block mb-2">Category *</label>
              <Select 
                value={newTicket.category} 
                onValueChange={(v) => setNewTicket({...newTicket, category: v})}
              >
                <SelectTrigger className="bg-stone-800 border-amber-600/30 text-amber-100">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-800 border-amber-600/30">
                  {TICKET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
                      <span className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-amber-200 text-sm block mb-2">Subject *</label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                placeholder="Brief description of your issue"
                className="bg-stone-800 border-amber-600/30 text-amber-100"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-amber-200 text-sm block mb-2">Description *</label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                placeholder="Please describe your issue in detail..."
                className="bg-stone-800 border-amber-600/30 text-amber-100 min-h-[120px]"
                maxLength={2000}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </form>
        )}

        {/* Ticket List */}
        {activeTab === 'tickets' && !selectedTicket && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-amber-400/60">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No support tickets yet</p>
              </div>
            ) : (
              tickets.map(ticket => {
                const status = TICKET_STATUS[ticket.metadata.status] || TICKET_STATUS.open;
                return (
                  <Card 
                    key={ticket.id}
                    className="bg-stone-800/50 border-amber-600/20 cursor-pointer hover:border-amber-500/50 transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-amber-100 font-medium text-sm line-clamp-1">
                            {ticket.metadata.subject}
                          </p>
                          <p className="text-amber-400/60 text-xs mt-1">
                            {ticket.metadata.ticket_id}
                          </p>
                        </div>
                        <Badge className={`${status.color} text-white text-xs`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-amber-400/50">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_date).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Ticket Detail */}
        {activeTab === 'tickets' && selectedTicket && (
          <div className="flex flex-col h-[60vh]">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="text-amber-400"
              >
                ← Back
              </Button>
              <Badge className={`${TICKET_STATUS[selectedTicket.metadata.status]?.color} text-white`}>
                {TICKET_STATUS[selectedTicket.metadata.status]?.label}
              </Badge>
            </div>

            <div className="mb-2">
              <h3 className="text-amber-100 font-medium">{selectedTicket.metadata.subject}</h3>
              <p className="text-amber-400/60 text-xs">{selectedTicket.metadata.ticket_id}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {selectedTicket.metadata.messages?.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.from === 'user' 
                      ? 'bg-amber-600/20 ml-4' 
                      : 'bg-stone-800 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-400/70">
                      {msg.from === 'user' ? 'You' : 'Support Team'}
                    </span>
                    <span className="text-xs text-amber-400/50">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-amber-100 text-sm">{msg.content}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            {selectedTicket.metadata.status !== 'closed' && (
              <div className="flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="bg-stone-800 border-amber-600/30 text-amber-100"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                />
                <Button 
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || addReplyMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Help Links */}
        <div className="mt-6 pt-4 border-t border-amber-600/20">
          <p className="text-amber-400/70 text-xs mb-2">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-amber-600/20 text-amber-200 border-amber-600/30 text-xs">
              FAQs
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-amber-600/20 text-amber-200 border-amber-600/30 text-xs">
              Community Guidelines
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-amber-600/20 text-amber-200 border-amber-600/30 text-xs">
              Payment Help
            </Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}