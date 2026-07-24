<template>
  <LegalDocument
    label="Legal"
    title="Terms & Conditions"
    compliance="Compliant with French law and the GDPR"
  >
    <section v-for="section in sections" :key="section.title">
      <h2>{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs || []" :key="paragraph">
        {{ paragraph }}
      </p>

      <p v-if="section.acceptancePrivacy">
        By creating an account or using the Platform, the User unconditionally accepts these Terms
        as well as the
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
      </p>
      <p v-if="section.dataPrivacy">
        The processing of personal data is described in the
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink>, compliant with the GDPR.
      </p>

      <ul v-if="section.items?.length">
        <li v-for="item in section.items" :key="item">{{ item }}</li>
      </ul>

      <div v-for="subsection in section.subsections || []" :key="subsection.title">
        <h3>{{ subsection.title }}</h3>
        <p v-for="paragraph in subsection.paragraphs || []" :key="paragraph">
          {{ paragraph }}
        </p>
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
    title: "1. PURPOSE",
    paragraphs: [
      `These Terms & Conditions ("Terms") govern access to and use of the Make it Art platform (the "Site," the "Platform"), published by Make it Art SARL, a marketplace dedicated to the distribution, promotion, and sale of digital artworks, including in NFT form.`
    ],
    acceptancePrivacy: true
  },
  {
    title: "2. LEGAL NOTICE",
    items: [
      "Publisher: Make it Art SARL",
      "Co-founders: Iness Benaissa and Vivien Bellaire",
      "Contact: contact@makeitart.io",
      "See Legal Notice for full details, including company registration number and hosting provider."
    ]
  },
  {
    title: "3. ACCESS TO THE PLATFORM",
    subsections: [
      {
        title: "3.1 Legal Capacity",
        paragraphs: [
          "Use of the Platform is reserved for individuals with legal capacity to contract under French law, or duly represented legal entities. Minor users must have the authorization of their legal guardian."
        ]
      },
      {
        title: "3.2 Account Creation",
        paragraphs: [
          "Registration requires accurate, complete, and up-to-date information, including name, email, and, for Artists, relevant professional information. The User is responsible for the confidentiality of their credentials and for all activity carried out from their account."
        ]
      },
      {
        title: "3.3 Account Types",
        items: [
          "Buyer Account: free, allows browsing and purchasing artworks.",
          "Artist Account: subject to approval by the Marketplace, additionally governed by the Artist Collaboration Agreement."
        ]
      }
    ]
  },
  {
    title: "4. DESCRIPTION OF SERVICES",
    paragraphs: ["The Platform allows:"],
    items: [
      "Artists to create, distribute, and sell original digital artworks, including illustrations, photography, 3D art and motion design, including as NFTs.",
      "Buyers to discover, acquire, and collect these artworks.",
      "Secure processing of payments in euros through Stripe, Revolut, Google Pay, Apple Pay and Paylib and, for NFTs, wallet-to-wallet crypto transactions through MetaMask or WalletConnect."
    ],
    subsections: [
      {
        title: "Technical intermediary",
        paragraphs: [
          "Make it Art acts as a technical intermediary between Artists and Buyers. Make it Art does not create, hold, or guarantee the artworks offered by Artists."
        ]
      }
    ]
  },
  {
    title: "5. ARTWORKS AND CONTENT",
    subsections: [
      {
        title: "5.1 Artist Warranties",
        paragraphs: [
          "The Artist warrants that they are the original author of their artworks, hold all necessary rights, and that their artworks do not infringe any third-party rights. These commitments are detailed in the Artist Collaboration Agreement."
        ]
      },
      {
        title: "5.2 Prohibited Content",
        paragraphs: ["The following content is strictly prohibited:"],
        items: [
          "Content infringing third-party intellectual property rights.",
          "Content of a child sexual abuse nature.",
          "Unlawful, hateful, violent, discriminatory, or defamatory content.",
          "Fraudulent or misleading content."
        ]
      },
      {
        title: "5.3 Moderation",
        paragraphs: [
          "Make it Art reserves the right to remove any content that violates these Terms or the law, informing the Artist where reasonably possible, except in cases of legal or safety urgency."
        ]
      },
      {
        title: "5.4 Ownership of Artworks",
        paragraphs: [
          "The Artist retains full copyright ownership. Purchasing an artwork grants the Buyer a usage license defined by the Artist at the time of sale, whether for personal, commercial, or exclusive use, without transfer of copyright unless expressly stated otherwise."
        ]
      }
    ]
  },
  {
    title: "6. PURCHASES, PAYMENTS, AND COMMISSIONS",
    subsections: [
      {
        title: "6.1 Payment Methods",
        paragraphs: [
          "Credit card, Google Pay, Apple Pay, Paylib, and bank transfer via Stripe or Revolut for euro or USD payments; crypto wallets such as MetaMask and WalletConnect for NFT transactions."
        ]
      },
      {
        title: "6.2 Commissions and Royalties",
        paragraphs: [
          "Make it Art charges a commission of 5 to 10% on primary sales. Resale royalties of 5 to 15%, set by the Artist, are paid automatically via smart contract on secondary market resales."
        ]
      },
      {
        title: "6.3 Cryptocurrency Transactions",
        paragraphs: [
          "NFT transactions occur directly wallet-to-wallet. Make it Art does not hold, convert, or control cryptocurrency funds at any point, confirming its NOT-PSAN status. Blockchain transactions are irreversible; Make it Art cannot cancel or modify them."
        ]
      },
      {
        title: "6.4 Refunds",
        paragraphs: [
          "Downloaded digital content or minted NFTs are non-refundable, except where the artwork clearly does not match its description or in the event of a technical failure attributable to the Platform. Requests must be sent to contact@makeitart.io within 14 days."
        ]
      },
      {
        title: "6.5 Taxes",
        paragraphs: [
          "Each User is solely responsible for declaring and paying taxes applicable to their transactions, including income tax and VAT where applicable. The standard VAT rate applicable in France is 20%."
        ]
      }
    ]
  },
  {
    title: "7. BLOCKCHAIN AND NFTs",
    subsections: [
      {
        title: "7.1 Nature of the NFT",
        paragraphs: [
          "An NFT represents a token recorded on the blockchain, associated with an artwork and the license rights defined at the time of sale. Purchasing an NFT does not automatically transfer copyright in the underlying artwork."
        ]
      },
      {
        title: "7.2 Networks Used",
        paragraphs: [
          "The Platform relies on the Ethereum and Polygon networks. Make it Art shall not be held liable for congestion, forks, or outages of these networks, which are beyond its control."
        ]
      },
      {
        title: "7.3 Wallet Responsibility",
        paragraphs: [
          "The User is solely responsible for the security of their crypto wallet and private keys. Make it Art never asks for this information and cannot be held liable for losses resulting from User negligence."
        ]
      }
    ]
  },
  {
    title: "8. INTELLECTUAL PROPERTY OF THE PLATFORM",
    paragraphs: [
      `The Platform's elements, including its logo, design, code and "Make it Art" trademark, are protected by intellectual property law and remain the exclusive property of Make it Art SARL, excluding artworks published by Artists.`
    ]
  },
  {
    title: "9. USER CONDUCT",
    paragraphs: ["The User agrees not to:"],
    items: [
      "Infringe third-party rights or the law.",
      "Artificially manipulate prices or sales statistics.",
      "Use unauthorized automated tools such as bots or scrapers.",
      "Circumvent payment or commission systems.",
      "Impersonate any third party.",
      "Distribute malicious content such as viruses or malware."
    ],
    subsections: [
      {
        title: "Consequences",
        paragraphs: [
          "Any breach may result in suspension or termination of the account, with prior notice where reasonably possible."
        ]
      }
    ]
  },
  {
    title: "10. LIABILITY",
    items: [
      "10.1 Make it Art uses reasonable means to ensure the availability and security of the Platform, without guaranteeing absolute continuity.",
      "10.2 Make it Art does not guarantee the value, future authenticity, or resale of artworks or NFTs.",
      "10.3 Make it Art's liability cannot be engaged for disputes between Artists and Buyers, provided the Platform has met its moderation and transaction security obligations."
    ]
  },
  { title: "11. PERSONAL DATA", dataPrivacy: true },
  {
    title: "12. TERM AND TERMINATION",
    items: [
      "12.1 These Terms apply for the entire duration of use of the Platform.",
      "12.2 The User may delete their account at any time via account settings or by contacting contact@makeitart.io.",
      "12.3 Make it Art may suspend or terminate an account in the event of a serious breach of these Terms, following notification except in urgent cases."
    ]
  },
  {
    title: "13. AMENDMENTS TO THE TERMS",
    paragraphs: [
      "Make it Art reserves the right to amend these Terms. Users will be informed of any material change by email or Platform notification at least 30 days before it takes effect."
    ]
  },
  {
    title: "14. GOVERNING LAW AND JURISDICTION",
    paragraphs: [
      "These Terms are governed by French law. Any dispute relating to their interpretation or performance that cannot be resolved amicably shall be submitted to the competent courts of Paris.",
      "In accordance with applicable regulations, consumer Users may also use an online dispute resolution platform or a consumer mediator."
    ]
  },
  {
    title: "15. CONTACT",
    paragraphs: ["For any questions regarding these Terms: contact@makeitart.io"]
  }
];
</script>
