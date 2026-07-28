import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCertificateDownloadUrl,
  getDigitalDeliveryPresentation
} from "../utils/digital-delivery.js";

test("digital delivery labels distinguish active, suspended and revoked rights", () => {
  assert.equal(getDigitalDeliveryPresentation("ACTIVE").tone, "success");
  assert.match(getDigitalDeliveryPresentation("SUSPENDED").message, /litige/i);
  assert.equal(getDigitalDeliveryPresentation("REVOKED").tone, "error");
  assert.doesNotMatch(getDigitalDeliveryPresentation(undefined).message, /disponible\./i);
});

test("purchase certificate links are owner order-scoped and safely encoded", () => {
  assert.equal(
    buildCertificateDownloadUrl(
      "75ad34cf-5ee4-4838-b36f-fac65a40f1e9",
      "1b5d0a0c-d743-4a0b-aed4-e6402058dd77"
    ),
    "/api/v1/orders/75ad34cf-5ee4-4838-b36f-fac65a40f1e9/certificates/1b5d0a0c-d743-4a0b-aed4-e6402058dd77.pdf"
  );
  assert.equal(buildCertificateDownloadUrl(null, "certificate"), null);
});
