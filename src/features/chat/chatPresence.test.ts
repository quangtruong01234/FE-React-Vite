import { describe, it, expect } from 'vitest';
import { shouldPlayPresenceSound, unjoinedConversationIds } from './chatPresence';

describe('shouldPlayPresenceSound', () => {
  const msg = { senderId: 2, conversationId: 10 };

  it('plays for an inbound message on a non-active conversation', () => {
    expect(shouldPlayPresenceSound(msg, 1, null)).toBe(true);
    expect(shouldPlayPresenceSound(msg, 1, 99)).toBe(true);
  });

  it('stays silent for the viewer\'s own outbound message', () => {
    expect(shouldPlayPresenceSound({ senderId: 1, conversationId: 10 }, 1, null)).toBe(false);
  });

  it('stays silent on the active conversation (its own socket handles the sound)', () => {
    expect(shouldPlayPresenceSound(msg, 1, 10)).toBe(false);
  });

  it('stays silent when the viewer id is unknown', () => {
    expect(shouldPlayPresenceSound(msg, undefined, null)).toBe(false);
  });
});

describe('unjoinedConversationIds', () => {
  it('returns ids not yet in the joined set', () => {
    const convs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(unjoinedConversationIds(convs, new Set([2]))).toEqual([1, 3]);
  });

  it('returns an empty array when all are joined', () => {
    const convs = [{ id: 1 }, { id: 2 }];
    expect(unjoinedConversationIds(convs, new Set([1, 2]))).toEqual([]);
  });

  it('returns every id when none are joined', () => {
    const convs = [{ id: 5 }, { id: 6 }];
    expect(unjoinedConversationIds(convs, new Set())).toEqual([5, 6]);
  });
});
