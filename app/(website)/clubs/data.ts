// app/(website)/clubs/data.ts
export interface ClubContact {
  role: string;
  name: string;
  email: string;
  phone: string;
}

export interface Club {
  title: string;
  description: string;
  icon?: string;
  iconSrc?: string;
  href: string;
  xhref: string;
  slug: string;
  color: string;
  about: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  contacts: ClubContact[]; // Add this array
  address: string;
}

export const CLUBS_DATA: Club[] = [
  {
    title: "Commercial Hockey Club",
    description: "Hockey club based in Brisbane, Queensland, Australia.",
    icon: "⚡",
    iconSrc: "/icons/chc.png",
    href: "https://commercialhockeyclub.majestri.com.au/wspHome.aspx",
    xhref: "/clubs/commercial-hockey", // Add this
    slug: "commercial-hockey",
    address: "106 Finsbury Street, Newmarket, QLD, 4051	",
    color: "#8b39d3", // Purple
    about: `
      <strong>How the Commercial Hockey Club was formed</strong> 
      <br /><br />
      The Commercial Hockey Club (CHC) was formed in 1944, when a group of high school students at the State Commercial High School in George Street, Brisbane, formed a J2 team to play in the Brisbane Junior Hockey fixtures.  The founding members included Stan Griffin OAM, Eric Vile, Arnold Dodd, K. Schwede, T Lang and R Mavromatie.

<br /><br />By the end of 1945, most of the original members had left high school and in 1946 CHC fielded a B2 team and a J2 team.  The number of our teams grew over the following years and in 1949 CHC won its first premiership in the B1 Grade.
<br /><br />Our first women’s team was formed in 1949.
<br /><br />It has been a fantastic rollercoaster ride up to the present where we have become Brisbane Hockey’s foremost family club.
    `,
    facebookUrl: "https://www.facebook.com/www.chcestablished1944.com.au",
    instagramUrl: "https://www.instagram.com/commercialhockey/",
    twitterUrl: "https://twitter.com/CommHockeyClub",
    contacts: [
      {
        role: "President",
        name: "Paul Dawson",
        email: "	president@commercialhockeyclub.com",
        phone: "0409 329 766",
      },
      {
        role: "Secretary",
        name: "Jo Hudson",
        email: "	secretary@commercialhockeyclub.com",
        phone: "0448 748 231",
      },
      {
        role: "Treasurer",
        name: "Nicola Lambie",
        email: "treasurer@commercialhockeyclub.com",
        phone: "0430 942 611",
      },
      {
        role: "Men's Players Chairperson",
        name: "Grant Mapp",
        email: "mchair@commercialhockeyclub.com",
        phone: "	0402 264 865",
      },
      {
        role: "Women's Players Chairperson",
        name: "Carol Chui Chong",
        email: "wchair@commercialhockeyclub.com",
        phone: "0412 977 189",
      },
      {
        role: "Junior Boys Chairperson",
        name: "JSylvia Fraser",
        email: "jboyschair@commercialhockeyclub.com",
        phone: "0406 334 162",
      },
      {
        role: "Junior Girls Chairperson",
        name: "Chris Rush",
        email: "jgchair@commercialhockeyclub.com",
        phone: "0424 172 245",
      },
    ],
  },
  {
    title: "Bulimba Hockey Club",
    description: "Welcome to the Bulimba Bulls!",
    icon: "🎨",
    iconSrc: "/icons/bulls.png",
    href: "https://bulimbahc.majestri.com.au/",
    xhref: "/clubs/bulimba-hockey", // Add this
    slug: "bulimba-hockey",
    color: "#49ed69",
    about: ``,
    facebookUrl: "https://www.facebook.com/BulimbaHockeyClub",
    instagramUrl: "https://www.instagram.com/bulimbahockeyclub/",
    twitterUrl: "https://twitter.com/BulimbaHockey",
  },
  {
    title: "All Strars Hockey Club",
    description: "Fully optimized for mobile, tablet, and desktop screens.",
    icon: "📱",
    iconSrc: "/icons/allstars.jpg",
    href: "https://allstarshockeyclub.wixsite.com/home",
    xhref: "/clubs/allstars-hockey", // Add this
    clubContact: "/clubs/allstars-contact",
    slug: "allstars-hockey",
    color: "#1a1a1a",
  },
  {
    title: "Kedron Wavell Hockey Club",
    description: "Fully optimized for mobile, tablet, and desktop screens.",
    icon: "📱",
    iconSrc: "/icons/kedronwavell.png",
    href: "https://kwhockey.com/",
    xhref: "/clubs/kedronwavell-hockey", // Add this
    slug: "kedronwavell-hockey",
    color: "#c40a16",
  },
];
