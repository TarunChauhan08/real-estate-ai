import { canTransitionLeadStatus, LeadStatus } from '@rea/shared-types';

describe('canTransitionLeadStatus', () => {
  it('allows staying in the same status', () => {
    for (const status of Object.values(LeadStatus)) {
      expect(canTransitionLeadStatus(status, status)).toBe(true);
    }
  });

  it('treats WON as terminal', () => {
    for (const to of Object.values(LeadStatus)) {
      if (to !== LeadStatus.WON) expect(canTransitionLeadStatus(LeadStatus.WON, to)).toBe(false);
    }
  });

  it('only lets a LOST lead be re-opened as NEW', () => {
    expect(canTransitionLeadStatus(LeadStatus.LOST, LeadStatus.NEW)).toBe(true);
    expect(canTransitionLeadStatus(LeadStatus.LOST, LeadStatus.WON)).toBe(false);
    expect(canTransitionLeadStatus(LeadStatus.LOST, LeadStatus.CONTACTED)).toBe(false);
  });

  it('allows moving freely between open statuses', () => {
    expect(canTransitionLeadStatus(LeadStatus.NEW, LeadStatus.WON)).toBe(true);
    expect(canTransitionLeadStatus(LeadStatus.NEW, LeadStatus.LOST)).toBe(true);
  });
});
