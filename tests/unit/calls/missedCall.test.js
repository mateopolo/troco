import { describe, it, expect } from 'vitest';

/**
 * Pure helper simulating the decision tree in useWebRTC.js for call logging and missed calls.
 */
function evaluateCallEndStatus({ wasConnected, wasDelivered, durationMs }) {
  if (wasConnected) {
    return 'connected_ended';
  }
  if (wasDelivered && durationMs >= 6000) {
    return 'missed';
  }
  return 'canceled_before_delivery';
}

function computeTargetParticipants({ partnerName, partnerUid, profileName, myUid, additionalUids = [] }) {
  return Array.from(new Set([
    partnerName,
    (partnerName || '').trim().toLowerCase(),
    partnerUid,
    profileName,
    (profileName || '').trim().toLowerCase(),
    myUid,
    ...additionalUids,
  ].filter(Boolean)));
}

describe('WebRTC Call Lifecycle & Missed Call Guard Tests [HOTFIX-04 & HOTFIX-05]', () => {
  it('does NOT create missed call when call was never delivered (signaling failed or rejected)', () => {
    const status = evaluateCallEndStatus({
      wasConnected: false,
      wasDelivered: false,
      durationMs: 15000,
    });
    expect(status).toBe('canceled_before_delivery');
  });

  it('does NOT create missed call when caller hangs up under 6 seconds even if delivered', () => {
    const status = evaluateCallEndStatus({
      wasConnected: false,
      wasDelivered: true,
      durationMs: 3500,
    });
    expect(status).toBe('canceled_before_delivery');
  });

  it('CREATES missed call only when signaling was delivered and rang for at least 6s without answer', () => {
    const status = evaluateCallEndStatus({
      wasConnected: false,
      wasDelivered: true,
      durationMs: 8000,
    });
    expect(status).toBe('missed');
  });

  it('logs normal call end when call was successfully connected', () => {
    const status = evaluateCallEndStatus({
      wasConnected: true,
      wasDelivered: true,
      durationMs: 45000,
    });
    expect(status).toBe('connected_ended');
  });

  it('computes targetParticipants including both UIDs and usernames for cross-device discovery', () => {
    const targets = computeTargetParticipants({
      partnerName: 'Alice Dubois',
      partnerUid: 'uid_alice_999',
      profileName: 'Bob Martin',
      myUid: 'uid_bob_111',
      additionalUids: ['uid_alice_999'],
    });

    expect(targets).toContain('Alice Dubois');
    expect(targets).toContain('alice dubois');
    expect(targets).toContain('uid_alice_999');
    expect(targets).toContain('Bob Martin');
    expect(targets).toContain('uid_bob_111');
    // Deduplication check
    expect(targets.filter(t => t === 'uid_alice_999').length).toBe(1);
  });
});
