import type { Conversation, Message } from '@/types';

/**
 * Whether the app-wide presence listener should play the "message received"
 * sound for an incoming socket message.
 *
 * True only for inbound messages (sender ≠ viewer) on a conversation the viewer
 * is NOT currently looking at. The open thread runs its own socket (`useChat`)
 * and plays its own sound, so skipping the active conversation here prevents a
 * double beep.
 */
export function shouldPlayPresenceSound(
  message: Pick<Message, 'senderId' | 'conversationId'>,
  viewerId: number | undefined,
  activeConversationId: number | null,
): boolean {
  if (viewerId === undefined) return false;
  if (message.senderId === viewerId) return false;
  return message.conversationId !== activeConversationId;
}

/** Conversation ids present in the list but not yet joined on the socket. */
export function unjoinedConversationIds(
  convs: Pick<Conversation, 'id'>[],
  joined: ReadonlySet<number>,
): number[] {
  return convs.map((c) => c.id).filter((id) => !joined.has(id));
}
