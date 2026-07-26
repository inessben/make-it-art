<template>
  <LegalDocument
    label="Legal"
    title="Cookie Policy"
    compliance="Compliant with the GDPR and the ePrivacy Directive"
  >
    <section>
      <h2>Manage Your Cookie Preferences</h2>
      <p>
        You can change your choice at any time. Rejecting analytics cookies disables the Umami
        tracking script; strictly necessary cookies (login, security) cannot be disabled here
        because the Platform cannot function without them.
      </p>
      <div class="mt-5 flex flex-wrap items-center gap-4">
        <p class="!mt-0 text-body-1 text-slate-300">
          Current choice:
          <strong class="text-slate-100">{{ currentChoiceLabel }}</strong>
        </p>
        <div class="flex gap-3">
          <button type="button" class="ui-button-secondary" @click="reject">
            Reject non-essential
          </button>
          <button type="button" class="ui-button-primary" @click="accept">Accept all</button>
        </div>
      </div>
    </section>

    <section v-for="section in sections" :key="section.title">
      <h2>{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs || []" :key="paragraph">{{ paragraph }}</p>

      <p v-if="section.important" class="legal-note">{{ section.important }}</p>

      <ul v-if="section.items?.length">
        <li v-for="item in section.items" :key="item">{{ item }}</li>
      </ul>

      <table v-if="section.table">
        <thead>
          <tr>
            <th v-for="header in section.table.headers" :key="header">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in section.table.rows" :key="row[0]">
            <td v-for="(cell, index) in row" :key="index">{{ cell }}</td>
          </tr>
        </tbody>
      </table>

      <div v-for="subsection in section.subsections || []" :key="subsection.title">
        <h3>{{ subsection.title }}</h3>
        <p v-for="paragraph in subsection.paragraphs || []" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="subsection.items?.length">
          <li v-for="item in subsection.items" :key="item">{{ item }}</li>
        </ul>
        <table v-if="subsection.table">
          <thead>
            <tr>
              <th v-for="header in subsection.table.headers" :key="header">{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in subsection.table.rows" :key="row[0]">
              <td v-for="(cell, index) in row" :key="index">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="section.contactEmail">
        Questions about this Cookie Policy? Contact:
        <a :href="`mailto:${section.contactEmail}`">{{ section.contactEmail }}</a>
      </p>
    </section>
  </LegalDocument>
</template>

<script setup>
import { computed } from "vue";
import { useCookieConsent } from "~/composables/useCookieConsent";

const { status, hasChosen, accept, reject } = useCookieConsent();

const currentChoiceLabel = computed(() => {
  if (!hasChosen.value) return "Not set yet";
  return status.value === "accepted" ? "Accepted all" : "Rejected non-essential";
});

const sections = [
  {
    title: "1. What Are Cookies",
    paragraphs: [
      `A cookie is a small text file stored on your device when you visit a website. It allows the site to recognize your browser, maintain your session, and remember certain information between page loads.`,
      "This policy describes the cookies and tracking scripts used by the Make it Art platform (the “Platform”), why we use them, and how you can control them. It complements our Privacy Policy."
    ]
  },
  {
    title: "2. Strictly Necessary Cookies",
    paragraphs: [
      "These cookies are required for the Platform to work: authentication, security, and login preferences. They cannot be disabled and are exempt from consent under Article 82 of the French Data Protection Act and Article 5(3) of the ePrivacy Directive."
    ],
    table: {
      headers: ["Cookie", "Purpose", "Duration", "Type"],
      rows: [
        [
          "mia_session",
          "Keeps you signed in by storing your short-lived access token.",
          "15 minutes",
          "Strictly necessary"
        ],
        [
          "mia_refresh",
          "Renews your session without asking you to log in again.",
          "7 days",
          "Strictly necessary"
        ],
        [
          "mia_login_challenge",
          "Tracks an in-progress two-factor authentication (2FA) login attempt.",
          "10 minutes",
          "Strictly necessary"
        ],
        [
          "mia_remember_device",
          "Remembers a trusted device so it can skip the 2FA code on your next login.",
          "30 days",
          "Strictly necessary"
        ],
        [
          "mia_google_oauth_state",
          "Protects the “Sign in with Google” flow against forgery (CSRF).",
          "10 minutes",
          "Strictly necessary"
        ],
        [
          "mia_google_oauth_link",
          "Keeps track of linking a Google account to an existing Make it Art account.",
          "10 minutes",
          "Strictly necessary"
        ]
      ]
    }
  },
  {
    title: "3. Analytics (Only With Your Consent)",
    paragraphs: [
      "We use Umami, a privacy-friendly, self-hosted analytics tool, to understand overall traffic and improve the Platform. Umami does not sell or share data with third parties and does not build advertising profiles.",
      "By default, Umami does not use cookies: it computes a rotating, anonymized daily visit identifier from your IP address and browser data, and never stores your IP address itself. Even so, we treat this tracking as non-essential and only load the Umami script after you click “Accept all” in the cookie banner or above. Rejecting keeps the script from ever loading."
    ],
    table: {
      headers: ["Script", "Purpose", "Data stored", "Consent required"],
      rows: [
        [
          "Umami tracking script",
          "Aggregated, anonymized page-view and traffic statistics.",
          "No cookie; a rotating anonymized daily visit ID (no IP address retained).",
          "Yes"
        ]
      ]
    }
  },
  {
    title: "4. Third-Party Cookies (Payments)",
    paragraphs: [
      "Card and wallet payments on the Platform are processed by Stripe. Once you reach checkout, Stripe may set its own cookies on stripe.com to prevent fraud and secure the payment form. Make it Art does not control these cookies and never has access to your card details.",
      "These cookies only apply once you actively start a payment; they are not set anywhere else on the Platform."
    ],
    table: {
      headers: ["Cookie", "Purpose", "Duration", "Set by"],
      rows: [
        ["__stripe_mid", "Fraud prevention for the payment session.", "1 year", "Stripe"],
        ["__stripe_sid", "Fraud prevention for the payment session.", "30 minutes", "Stripe"]
      ]
    },
    subsections: [
      {
        title: "Learn more",
        paragraphs: [
          "For details on Stripe's own cookies and data practices, see Stripe's privacy policy at stripe.com/privacy."
        ]
      }
    ]
  },
  {
    title: "5. Cookies We Do Not Use",
    paragraphs: ["Make it Art does not use:"],
    items: [
      "Advertising or retargeting cookies.",
      "Social media tracking cookies.",
      "Any cookie or script used to build a cross-site advertising profile."
    ]
  },
  {
    title: "6. How to Control Cookies in Your Browser",
    paragraphs: [
      "In addition to the preferences above, you can configure your browser to block or delete cookies at any time. Because our strictly necessary cookies cannot be turned off from this page, blocking them at the browser level will prevent you from staying signed in, completing two-factor authentication, or using Google Sign-In."
    ],
    items: [
      "Chrome: Settings → Privacy and security → Cookies and other site data.",
      "Firefox: Settings → Privacy & Security → Cookies and Site Data.",
      "Safari: Preferences → Privacy → Manage Website Data.",
      "Edge: Settings → Cookies and site permissions."
    ]
  },
  {
    title: "7. Changes to This Policy",
    paragraphs: [
      "Make it Art may update this Cookie Policy to reflect changes in the cookies and tracking scripts we use, or in applicable law. Material changes will be notified in accordance with the Privacy Policy."
    ]
  },
  {
    title: "8. Contact",
    contactEmail: "support@makeitart.io"
  }
];
</script>
