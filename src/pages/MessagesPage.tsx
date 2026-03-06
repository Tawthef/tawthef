import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  ConversationItem,
  useConversationMessages,
  useConversations,
  useMarkConversationRead,
  useRecruiterCandidateContacts,
  useSendMessage,
} from "@/hooks/useMessages";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Search, SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const RECRUITER_ROLES = ["employer", "agency", "admin"] as const;

const formatConversationTime = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatMessageTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const MessagesPage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRecruiter = !!profile?.role && RECRUITER_ROLES.includes(profile.role as (typeof RECRUITER_ROLES)[number]);

  const [searchValue, setSearchValue] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");

  const { data: baseConversations = [], isLoading: isConversationsLoading } = useConversations();
  const { data: recruiterCandidates = [] } = useRecruiterCandidateContacts(isRecruiter);
  const { data: messages = [], isLoading: isMessagesLoading } = useConversationMessages(selectedParticipantId);
  const sendMessageMutation = useSendMessage();
  const { mutate: markConversationRead, isPending: isMarkingConversationRead } = useMarkConversationRead();

  const threadBottomRef = useRef<HTMLDivElement | null>(null);

  const conversations = useMemo(() => {
    const merged = new Map<string, ConversationItem>();

    for (const conversation of baseConversations) {
      merged.set(conversation.participantId, conversation);
    }

    if (isRecruiter) {
      for (const candidate of recruiterCandidates) {
        if (merged.has(candidate.id)) continue;
        merged.set(candidate.id, {
          participantId: candidate.id,
          participantName: candidate.fullName || "Candidate",
          participantRole: "candidate",
          lastMessage: "",
          lastMessageAt: "",
          unreadCount: 0,
        });
      }
    }

    return Array.from(merged.values()).sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return a.participantName.localeCompare(b.participantName);
    });
  }, [baseConversations, isRecruiter, recruiterCandidates]);

  const filteredConversations = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return conversations;

    return conversations.filter(
      (conversation) =>
        conversation.participantName.toLowerCase().includes(search) ||
        conversation.lastMessage.toLowerCase().includes(search)
    );
  }, [conversations, searchValue]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.participantId === selectedParticipantId) || null,
    [conversations, selectedParticipantId]
  );

  useEffect(() => {
    if (!selectedParticipantId && conversations.length > 0) {
      setSelectedParticipantId(conversations[0].participantId);
    }
  }, [conversations, selectedParticipantId]);

  useEffect(() => {
    if (!selectedParticipantId || !selectedConversation?.unreadCount || isMarkingConversationRead) return;
    markConversationRead(selectedParticipantId);
  }, [isMarkingConversationRead, markConversationRead, selectedConversation?.unreadCount, selectedParticipantId]);

  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    const invalidateMessages = () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const channel = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          invalidateMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          invalidateMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const handleSendMessage = async () => {
    if (!selectedParticipantId) return;

    const cleanMessage = draftMessage.trim();
    if (!cleanMessage) return;

    try {
      await sendMessageMutation.mutateAsync({
        receiverId: selectedParticipantId,
        message: cleanMessage,
      });
      setDraftMessage("");
    } catch (error: any) {
      console.error("[MessagesPage] Failed to send message:", error);
      toast({
        title: "Message failed",
        description: error?.message || "Could not send this message.",
        variant: "destructive",
      });
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedParticipantId(conversationId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Chat directly between recruiters and candidates with real-time updates.
          </p>
        </div>

        <Card className="border-0 card-float">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] min-h-[70vh]">
              <div className="border-r border-border/40">
                <CardHeader className="space-y-4 pb-4">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search conversations"
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <Separator />
                <ScrollArea className="h-[58vh] lg:h-[62vh]">
                  <div className="p-2 space-y-1.5">
                    {isConversationsLoading ? (
                      <div className="h-40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : filteredConversations.length > 0 ? (
                      filteredConversations.map((conversation) => (
                        <button
                          key={conversation.participantId}
                          type="button"
                          className={cn(
                            "w-full rounded-lg px-3 py-3 text-left transition-colors border",
                            selectedParticipantId === conversation.participantId
                              ? "bg-primary/8 border-primary/30"
                              : "bg-transparent border-transparent hover:bg-muted/40"
                          )}
                          onClick={() => handleConversationSelect(conversation.participantId)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{conversation.participantName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {conversation.lastMessage || "Start a new conversation"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {conversation.lastMessageAt ? (
                                <span className="text-[11px] text-muted-foreground">
                                  {formatConversationTime(conversation.lastMessageAt)}
                                </span>
                              ) : null}
                              {conversation.unreadCount > 0 ? (
                                <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground">
                                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-center px-4">
                        <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No conversations found.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col min-h-[70vh]">
                {selectedConversation ? (
                  <>
                    <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Conversation</p>
                        <h2 className="font-semibold">{selectedConversation.participantName}</h2>
                      </div>
                      {selectedConversation.participantRole ? (
                        <Badge variant="outline" className="capitalize">
                          {selectedConversation.participantRole}
                        </Badge>
                      ) : null}
                    </div>

                    <ScrollArea className="flex-1 h-[48vh] lg:h-[54vh] p-5">
                      <div className="space-y-3">
                        {isMessagesLoading ? (
                          <div className="h-28 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        ) : messages.length > 0 ? (
                          messages.map((message) => {
                            const isSender = message.sender_id === user?.id;
                            return (
                              <div
                                key={message.id}
                                className={cn("max-w-[80%] rounded-2xl px-4 py-3", isSender ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted")}
                              >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.message}</p>
                                <p className={cn("text-[11px] mt-2", isSender ? "text-primary-foreground/80 text-right" : "text-muted-foreground")}>
                                  {formatMessageTime(message.created_at)}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-28 flex flex-col items-center justify-center text-center">
                            <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm text-muted-foreground">No messages yet. Send the first one.</p>
                          </div>
                        )}
                        <div ref={threadBottomRef} />
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t border-border/40 space-y-3">
                      <Textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[90px] resize-none"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            void handleSendMessage();
                          }}
                          disabled={sendMessageMutation.isPending || !draftMessage.trim()}
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <SendHorizonal className="w-4 h-4 mr-2" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <MessageCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <h3 className="text-lg font-semibold">Select a conversation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a conversation from the left panel to view and send messages.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MessagesPage;
