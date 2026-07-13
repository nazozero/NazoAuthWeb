import assert from 'node:assert/strict';
import test from 'node:test';
import { accessRequestDeliveryPath } from './accessDelivery.ts';

test('approved requests expose an encoded one-time delivery route', () => {
  assert.equal(
    accessRequestDeliveryPath(1, 'token/with+reserved='),
    '/delivery?token=token%2Fwith%2Breserved%3D'
  );
  assert.equal(accessRequestDeliveryPath(0, 'pending-token'), null);
  assert.equal(accessRequestDeliveryPath(1, undefined), null);
});
