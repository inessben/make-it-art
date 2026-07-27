<template>
  <LegalDocument
    label="Privacy"
    title="Privacy Policy"
    compliance="Compliant with the GDPR (General Data Protection Regulation)"
  >
    <section v-for="section in sections" :key="section.title">
      <h2>{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs || []" :key="paragraph">{{ paragraph }}</p>

      <p v-if="section.contactEmail">
        To exercise these rights, contact:
        <a :href="`mailto:${section.contactEmail}`">{{ section.contactEmail }}</a
        ><br />
        Response time: 30 days
      </p>

      <p v-if="section.dpoEmail">
        You may contact our DPO at:
        <a :href="`mailto:${section.dpoEmail}`">{{ section.dpoEmail }}</a>
      </p>

      <p v-if="section.cnil" class="legal-note">
        If you believe your rights are not being respected, you have the right to file a complaint
        with the <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <p v-if="section.important" class="legal-note">{{ section.important }}</p>

      <ul v-if="section.items?.length">
        <li v-for="item in section.items" :key="item">{{ item }}</li>
      </ul>

      <div v-for="subsection in section.subsections || []" :key="subsection.title">
        <h3>{{ subsection.title }}</h3>
        <p v-for="paragraph in subsection.paragraphs || []" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="subsection.items?.length">
          <li v-for="item in subsection.items" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>
  </LegalDocument>
</template>

<script setup>
const sections = [
  {
    title: "1. Data Controller",
    items: [
      "Name: Make it Art SARL",
      "Co-founders: Iness Benaissa and Vivien Bellaire",
      "Contact email: support@makeitart.io",
      "Address: Paris, France"
    ]
  },
  {
    title: "2. Data Collected",
    paragraphs: [
      "Make it Art collects the following data to ensure the Platform operates properly:"
    ],
    subsections: [
      {
        title: "2.1 Registration and Profile Data",
        items: [
          "Last name, first name, email address.",
          "Username and biography (optional).",
          "Profile picture (optional).",
          "Location information (optional)."
        ]
      },
      {
        title: "2.2 Payment and Financial Data",
        items: [
          "Billing and shipping address.",
          "Credit card number and security code (never stored by Make It Art; processed and, with your consent, retained by Stripe).",
          "For a saved card: Stripe identifiers, card brand, last four digits, expiration date, and a minimal record of your consent.",
          "Bank details for transfers.",
          "Crypto wallet address, including MetaMask, WalletConnect, and similar services.",
          "Transaction and purchase history."
        ]
      },
      {
        title: "2.3 Artist Data",
        items: [
          "Business registration (KBIS or equivalent) or self-employed status.",
          "VAT number, if applicable.",
          "Portfolio and catalog of works.",
          "Sales and engagement statistics."
        ]
      },
      {
        title: "2.4 Technical Data",
        items: [
          "IP address.",
          "Browser type and operating system.",
          "Pages visited, time spent, and actions taken.",
          "Cookies and tracking technologies (see Cookie Policy)."
        ]
      },
      {
        title: "2.5 Communication Data",
        items: [
          "Messages between Users.",
          "Support communications, including emails and chats.",
          "Feedback and reviews."
        ]
      }
    ]
  },
  {
    title: "3. Legal Basis for Processing",
    paragraphs: ["Make it Art processes your data on the following legal bases:"],
    items: [
      "Performance of a contract (Article 6.1.b GDPR): transactions, delivery of artworks, royalty management.",
      "Consent (Article 6.1.a GDPR): newsletters and marketing communications (opt-in).",
      "Legitimate interest (Article 6.1.f GDPR): fraud prevention, service improvement, security.",
      "Legal compliance (Article 6.1.c GDPR): tax, accounting, and legal obligations."
    ]
  },
  {
    title: "4. Purposes of Processing",
    items: [
      "Account management and authentication.",
      "Processing transactions and payments.",
      "Calculating and distributing royalties via smart contracts.",
      "Sending invoices and order confirmations.",
      "Customer support communications.",
      "Continuous improvement of the Platform.",
      "Combating fraud, abuse, and violations of the Terms & Conditions.",
      "Legal and tax compliance."
    ]
  },
  {
    title: "5. Data Recipients",
    paragraphs: ["Your data may be shared with:"],
    items: [
      "Payment partners: Stripe, Revolut, Google Pay, Apple Pay, and Paylib (minimal data).",
      "Blockchain networks: Ethereum and Polygon (public, irreversible transactions).",
      "Storage providers: IPFS for artworks.",
      "Analytics: Umami, self-hosted and only activated once you accept analytics cookies (see Cookie Policy).",
      "Legal and tax authorities, where legally required.",
      "Make it Art support team with limited, secure access."
    ],
    important:
      "IMPORTANT: Data published on the blockchain, including NFTs and transactions, is public and permanent. Make it Art cannot delete or modify it."
  },
  {
    title: "6. International Transfers",
    paragraphs: [
      "If your data is transferred outside the EU, Make it Art ensures an equivalent level of protection through:"
    ],
    items: [
      "Standard Contractual Clauses approved by the European Commission.",
      "Oversight of third-party partners, including Stripe and cloud services."
    ]
  },
  {
    title: "7. Data Retention Period",
    subsections: [
      {
        title: "7.1 Account Data",
        paragraphs: [
          "Retained for the active duration of the account plus 3 years after deletion for legal obligations."
        ]
      },
      {
        title: "7.2 Transaction Data",
        paragraphs: ["Retained for 10 years for accounting and tax compliance."]
      },
      {
        title: "7.3 Blockchain Data",
        paragraphs: ["Retained indefinitely because it is decentralized and immutable by nature."]
      }
    ]
  },
  {
    title: "8. Your Rights",
    paragraphs: ["In accordance with the GDPR, you have the following rights:"],
    contactEmail: "support@makeitart.io",
    subsections: [
      {
        title: "8.1 Right of Access",
        paragraphs: ["You can access your personal data by contacting support@makeitart.io."]
      },
      {
        title: "8.2 Right to Rectification",
        paragraphs: [
          "You can correct inaccurate data through your account or by requesting our assistance."
        ]
      },
      {
        title: '8.3 Right to Erasure ("Right to be Forgotten")',
        paragraphs: ["You can request the deletion of your data, except where:"],
        items: [
          "A legal obligation requires us to retain it.",
          "Unresolved disputes require its retention.",
          "The data has been made public on the blockchain."
        ]
      },
      {
        title: "8.4 Right to Restriction of Processing",
        paragraphs: ["You can request the restriction of processing of certain data."]
      },
      {
        title: "8.5 Right to Data Portability",
        paragraphs: ["You can receive your data in a structured, portable format."]
      },
      {
        title: "8.6 Right to Object",
        paragraphs: [
          "You can object to the processing of your data for marketing or profiling purposes."
        ]
      }
    ]
  },
  {
    title: "9. Data Security",
    paragraphs: ["Make it Art implements the following security measures:"],
    items: [
      "SSL/TLS encryption of all communications.",
      "Secure databases with multi-factor authentication.",
      "Regular security audits.",
      "Strict access control policy.",
      "Regular data backups."
    ],
    important:
      "While we strive to secure your data, no transmission over the Internet is 100% secure."
  },
  {
    title: "10. Breach Notification",
    paragraphs: [
      "In the event of a personal data breach, Make it Art will notify affected users and the data protection authority (CNIL) within 72 hours, in accordance with the GDPR."
    ]
  },
  {
    title: "11. Data Protection Officer (DPO)",
    dpoEmail: "support@makeitart.io"
  },
  {
    title: "12. Complaints to the CNIL",
    cnil: true
  }
];
</script>
