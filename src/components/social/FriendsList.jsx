import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Search,
  MessageCircle,
  Radio,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function FriendsList({ user }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', user?.email],
    queryFn: async () => {
      const sent = await base44.entities.Friendship.filter({ user_email: user.email });
      const received = await base44.entities.Friendship.filter({ friend_email: user.email });
      return [...sent, ...received];
    },
    enabled: !!user?.email
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users-for-friends'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    enabled: !!searchQuery
  });

  const { data: liveCreators = [] } = useQuery({
    queryKey: ['live-friends'],
    queryFn: async () => {
      const streams = await base44.entities.Stream.filter({ status: 'live' });
      return streams.map(s => s.creator_id);
    }
  });

  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const pendingReceived = friendships.filter(f => 
    f.status === 'pending' && f.friend_email === user?.email
  );
  const pendingSent = friendships.filter(f => 
    f.status === 'pending' && f.user_email === user?.email
  );

  const getFriendEmail = (friendship) => {
    return friendship.user_email === user?.email 
      ? friendship.friend_email 
      : friendship.user_email;
  };

  const sendRequestMutation = useMutation({
    mutationFn: async (friendEmail) => {
      await base44.entities.Friendship.create({
        user_email: user.email,
        friend_email: friendEmail,
        status: 'pending',
        initiated_by: user.email
      });

      await base44.entities.Notification.create({
        user_email: friendEmail,
        type: 'follow',
        title: 'Friend Request',
        message: `${user.full_name} sent you a friend request`,
        from_user_email: user.email,
        from_user_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['friendships']);
      toast.success('Friend request sent!');
      setSearchQuery('');
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ friendshipId, accept }) => {
      if (accept) {
        await base44.entities.Friendship.update(friendshipId, { status: 'accepted' });
      } else {
        await base44.entities.Friendship.delete(friendshipId);
      }
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries(['friendships']);
      toast.success(accept ? 'Friend request accepted!' : 'Friend request declined');
    }
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.delete(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries(['friendships']);
      toast.success('Friend removed');
    }
  });

  const filteredUsers = searchQuery 
    ? users.filter(u => 
        u.email !== user?.email &&
        !friendships.some(f => 
          f.user_email === u.email || f.friend_email === u.email
        ) &&
        (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  if (!user) return null;

  return (
    <Card className="bg-stone-900/80 border-amber-600/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Friends
          {acceptedFriends.length > 0 && (
            <Badge className="bg-amber-600/30 text-amber-300 ml-2">
              {acceptedFriends.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
          <Input
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-stone-800 border-amber-600/30 text-amber-100"
          />
        </div>

        {/* Search Results */}
        {filteredUsers.length > 0 && (
          <div className="space-y-2 p-3 bg-stone-800/50 rounded-lg">
            <p className="text-amber-400/70 text-xs">Search Results</p>
            {filteredUsers.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-stone-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-400 text-sm">
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-amber-100 text-sm">{u.full_name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendRequestMutation.mutate(u.email)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full bg-stone-800">
            <TabsTrigger value="friends" className="flex-1">
              Friends ({acceptedFriends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">
              Pending {pendingReceived.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white h-4 w-4 p-0 text-xs">
                  {pendingReceived.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <ScrollArea className="h-64">
              {acceptedFriends.length > 0 ? (
                <div className="space-y-2">
                  {acceptedFriends.map(friendship => {
                    const friendEmail = getFriendEmail(friendship);
                    const isLive = liveCreators.includes(friendEmail);

                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50 hover:bg-stone-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-400">
                              {friendEmail.charAt(0).toUpperCase()}
                            </div>
                            {isLive && (
                              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-red-500">
                                <Radio className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-amber-100 text-sm">{friendEmail}</p>
                            {isLive && (
                              <p className="text-red-400 text-xs">Live now</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="text-amber-400">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFriendMutation.mutate(friendship.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-amber-400/50">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-xs mt-1">Search to add friends</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending">
            <ScrollArea className="h-64">
              {pendingReceived.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-amber-400/70 text-xs px-1">Received</p>
                  {pendingReceived.map(friendship => (
                    <div
                      key={friendship.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-stone-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-400">
                          {friendship.user_email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-amber-100 text-sm">{friendship.user_email}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          onClick={() => respondMutation.mutate({ friendshipId: friendship.id, accept: true })}
                          className="bg-green-600 hover:bg-green-700 h-8 w-8"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => respondMutation.mutate({ friendshipId: friendship.id, accept: false })}
                          className="border-red-500/50 text-red-400 h-8 w-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingSent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-amber-400/70 text-xs px-1">Sent</p>
                  {pendingSent.map(friendship => (
                    <div
                      key={friendship.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-stone-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-amber-400/50">
                          {friendship.friend_email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-amber-100/70 text-sm">{friendship.friend_email}</span>
                          <div className="flex items-center gap-1 text-amber-400/50 text-xs">
                            <Clock className="w-3 h-3" />
                            Pending
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingReceived.length === 0 && pendingSent.length === 0 && (
                <div className="text-center py-8 text-amber-400/50">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}