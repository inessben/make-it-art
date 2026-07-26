import test from "node:test";
import assert from "node:assert/strict";

import { getDigitalDeliveryPresentation } from "../utils/digital-delivery.js";

test("digital delivery labels distinguish active, suspended and revoked rights", () => {
  assert.equal(getDigitalDeliveryPresentation("ACTIVE").tone, "success");
  assert.match(getDigitalDeliveryPresentation("SUSPENDED").message, /litige/i);
  assert.equal(getDigitalDeliveryPresentation("REVOKED").tone, "error");
  assert.doesNotMatch(getDigitalDeliveryPresentation(undefined).message, /disponible\./i);
});
