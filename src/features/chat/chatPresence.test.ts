import { describe, it, expect } from 'vitest';
import { shouldPlayPresenceSound, unjoinedConversationIds } from './chatPresence';

describe('shouldPlayPresenceSound', () => {
  const msg = { senderId: 'usr_2', conversationId: 'conv_10' };

  it('plays for an inbound message on a non-active conversation', () => {
    expect(shouldPlayPresenceSound(msg, 'usr_1', null)).toBe(true);
    expect(shouldPlayPresenceSound(msg, 'usr_1', 'conv_99')).toBe(true);
  });

  it('stays silent for the viewer\'s own outbound message', () => {
    expect(shouldPlayPresenceSound({ senderId: 'usr_1', conversationId: 'conv_10' }, 'usr_1', null)).toBe(false);
  });

  it('stays silent on the active conversation (its own socket handles the sound)', () => {
    expect(shouldPlayPresenceSound(msg, 'usr_1', 'conv_10')).toBe(false);
  });

  it('stays silent when the viewer id is unknown', () => {
    expect(shouldPlayPresenceSound(msg, undefined, null)).toBe(false);
  });
});

describe('unjoinedConversationIds', () => {
  it('returns ids not yet in the joined set', () => {
    const convs = [{ id: 'conv_1' }, { id: 'conv_2' }, { id: 'conv_3' }];
    expect(unjoinedConversationIds(convs, new Set(['conv_2']))).toEqual(['conv_1', 'conv_3']);
  });

  it('returns an empty array when all are joined', () => {
    const convs = [{ id: 'conv_1' }, { id: 'conv_2' }];
    expect(unjoinedConversationIds(convs, new Set(['conv_1', 'conv_2']))).toEqual([]);
  });

  it('returns every id when none are joined', () => {
    const convs = [{ id: 'conv_5' }, { id: 'conv_6' }];
    expect(unjoinedConversationIds(convs, new Set())).toEqual(['conv_5', 'conv_6']);
  });
});
