import type { PageContent } from './supabase'

export type PublicPageDefinition = {
  slug: string
  kicker: string
  content: PageContent
}

export const publicPages: Record<string, PublicPageDefinition> = {
  home: {
    slug: 'home',
    kicker: 'Renewable energy-powered aeration',
    content: {
      name: 'Home',
      headline: 'Better water. Stronger ecosystems.',
      description: 'MICRA develops practical, renewable energy-powered aeration solutions for productive water environments.',
      cta: { label: 'Explore our solutions', url: '/solutions', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Aeration designed around real needs',
          subtitle: 'A practical approach to water quality',
          description: 'MICRA brings aeration technology and renewable energy together to support healthier, more productive water environments.',
          type: 'Image and Text',
          visible: true,
          icon: 'waves',
        },
        {
          id: 2,
          title: 'Built for working water systems',
          subtitle: 'Solutions for farms and communities',
          description: 'Explore applications across aquaculture, agriculture, and water management, with an approach shaped by each site and its needs.',
          type: 'Feature Cards',
          visible: true,
          icon: 'leaf',
        },
        {
          id: 3,
          title: 'Progress through partnership',
          subtitle: 'Work with MICRA',
          description: 'We collaborate with farmers, organizations, and implementation partners to bring suitable solutions to the places that need them.',
          type: 'Call to Action',
          visible: true,
          icon: 'grid',
        },
      ],
    },
  },
  about: {
    slug: 'about',
    kicker: 'About MICRA',
    content: {
      name: 'About MICRA',
      headline: 'Technology with purpose, built around water.',
      description: 'MICRA works at the intersection of renewable energy, aeration, and productive water systems.',
      cta: { label: 'Talk with our team', url: '/contact', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Our focus',
          subtitle: 'Make useful technology accessible',
          description: 'We focus on practical aeration systems that can support water quality and productive ecosystems, with renewable energy as part of the solution.',
          type: 'Image and Text',
          visible: true,
          icon: 'sun',
        },
        {
          id: 2,
          title: 'How we work',
          subtitle: 'Listen, design, collaborate',
          description: 'Every water system has its own conditions. We work with local partners to understand those conditions and identify an appropriate way forward.',
          type: 'Feature Cards',
          visible: true,
          icon: 'users',
        },
      ],
    },
  },
  solutions: {
    slug: 'solutions',
    kicker: 'MICRA solutions',
    content: {
      name: 'Solutions',
      headline: 'Aeration solutions for productive water.',
      description: 'Explore renewable energy-powered aeration approaches for aquaculture, agriculture, and water management.',
      cta: { label: 'Discuss your application', url: '/contact', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Renewable energy-powered aeration',
          subtitle: 'Designed for water environments',
          description: 'Aeration helps circulate water and introduce oxygen. MICRA combines this essential process with renewable energy to support efficient operation in suitable settings.',
          type: 'Image and Text',
          visible: true,
          icon: 'sun',
        },
        {
          id: 2,
          title: 'Aquaculture',
          subtitle: 'Support for aquatic life',
          description: 'Aeration can support dissolved oxygen management in aquaculture. System design should be matched to the species, pond, operating conditions, and local guidance.',
          type: 'Feature Cards',
          visible: true,
          icon: 'waves',
        },
        {
          id: 3,
          title: 'Agriculture and water management',
          subtitle: 'Adaptable applications',
          description: 'Explore aeration for ponds, reservoirs, and other managed water systems. MICRA works with partners to assess the requirements of each application.',
          type: 'Feature Cards',
          visible: true,
          icon: 'leaf',
        },
      ],
    },
  },
  impact: {
    slug: 'impact',
    kicker: 'Our impact',
    content: {
      name: 'Impact',
      headline: 'Measure progress. Keep improving.',
      description: 'MICRA is focused on practical contributions to productive water systems and the communities connected to them.',
      cta: { label: 'Partner on an initiative', url: '/partnerships', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Environmental responsibility',
          subtitle: 'Consider the whole water system',
          description: 'Responsible implementation starts with understanding local conditions, energy use, water quality needs, and the surrounding ecosystem.',
          type: 'Impact Indicators',
          visible: true,
          icon: 'leaf',
        },
        {
          id: 2,
          title: 'Useful outcomes for operators',
          subtitle: 'Designed for everyday use',
          description: 'Solutions should be understandable, maintainable, and appropriate for the people who operate them. We work with stakeholders to keep those needs in view.',
          type: 'Stakeholder Benefits',
          visible: true,
          icon: 'users',
        },
      ],
    },
  },
  partnerships: {
    slug: 'partnerships',
    kicker: 'Work with MICRA',
    content: {
      name: 'Partnerships',
      headline: 'Bring the right people together.',
      description: 'MICRA welcomes collaboration with farmers, community organizations, businesses, and institutions working toward better water systems.',
      cta: { label: 'Start a conversation', url: '/contact', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Farm and site partners',
          subtitle: 'Put solutions into context',
          description: 'Share your operating conditions and goals so that a potential aeration solution can be assessed for your site.',
          type: 'Partnership Cards',
          visible: true,
          icon: 'waves',
        },
        {
          id: 2,
          title: 'Implementation partners',
          subtitle: 'Collaborate on delivery',
          description: 'Organizations with local knowledge and implementation experience can help shape useful, context-aware projects.',
          type: 'Partnership Cards',
          visible: true,
          icon: 'users',
        },
        {
          id: 3,
          title: 'Supply chain partners',
          subtitle: 'Build reliable relationships',
          description: 'We are interested in working with suppliers and service providers who share a focus on quality, reliability, and responsible practice.',
          type: 'Partnership Cards',
          visible: true,
          icon: 'grid',
        },
      ],
    },
  },
  'business-model': {
    slug: 'business-model',
    kicker: 'Business model',
    content: {
      name: 'Business Model',
      headline: 'A flexible path from need to solution.',
      description: 'MICRA works with customers and partners to understand site requirements and identify an appropriate way to move forward.',
      cta: { label: 'Discuss your needs', url: '/contact', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'Understand the application',
          subtitle: 'Start with the site and its goals',
          description: 'We begin by learning about the water environment, operating requirements, available infrastructure, and the outcomes stakeholders are seeking.',
          type: 'Business Model',
          visible: true,
          icon: 'search',
        },
        {
          id: 2,
          title: 'Shape a suitable approach',
          subtitle: 'Align the solution with the context',
          description: 'Technical and partnership options are considered against the needs of the site. Specific scope, cost, and delivery arrangements are discussed directly.',
          type: 'Business Model',
          visible: true,
          icon: 'settings',
        },
      ],
    },
  },
  insights: {
    slug: 'insights',
    kicker: 'Insights',
    content: {
      name: 'Insights',
      headline: 'Ideas for healthier, more productive water.',
      description: 'Explore the principles behind aeration, renewable energy, and responsible water system design.',
      cta: { label: 'Ask MICRA a question', url: '/contact', style: 'primary', openNewTab: false, visible: true },
      sections: [
        {
          id: 1,
          title: 'What aeration does',
          subtitle: 'Movement and oxygen in water',
          description: 'Aeration is used to promote gas exchange and water movement. The right method depends on the water body, its use, and its operating conditions.',
          type: 'Image and Text',
          visible: true,
          icon: 'waves',
        },
        {
          id: 2,
          title: 'Design for local conditions',
          subtitle: 'There is no one-size-fits-all system',
          description: 'Climate, water depth, species, energy availability, and maintenance capacity can all shape the design and operation of an aeration system.',
          type: 'Feature Cards',
          visible: true,
          icon: 'sun',
        },
      ],
    },
  },
  contact: {
    slug: 'contact',
    kicker: 'Contact MICRA',
    content: {
      name: 'Contact',
      headline: 'Let’s talk about your water system.',
      description: 'Tell us about your site, goals, or partnership idea. The MICRA team will review your message.',
      sections: [],
    },
  },
}

export const primaryNavigation = [
  { label: 'About', url: '/about' },
  { label: 'Solutions', url: '/solutions' },
  { label: 'Impact', url: '/impact' },
  { label: 'Partnerships', url: '/partnerships' },
  { label: 'Insights', url: '/insights' },
]
