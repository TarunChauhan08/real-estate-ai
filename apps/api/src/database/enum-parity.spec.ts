import * as Shared from '@rea/shared-types';
import * as Db from '../generated/prisma/enums';

/** Guards against the shared-types enums drifting from the database enums. */
describe('shared-types enums match Prisma enums', () => {
  it.each([
    'TenantStatus',
    'UserStatus',
    'BusinessType',
    'MembershipRole',
    'MembershipStatus',
    'PropertyType',
    'ListingType',
    'PropertyStatus',
    'PossessionStatus',
    'LeadSource',
    'LeadStatus',
    'LeadTemperature',
    'LeadPurpose',
    'PurchaseTimeline',
    'ConversationChannel',
    'ConversationStatus',
    'MessageRole',
    'MessageDeliveryStatus',
    'SiteVisitStatus',
  ] as const)('%s', (name) => {
    expect(Object.values(Shared[name]).sort()).toEqual(Object.values(Db[name]).sort());
  });
});
