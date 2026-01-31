const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://gedda:Mitch2009!@cluster0.6bk7t7n.mongodb.net/hockey-app?retryWrites=true&w=majority";

const dbName = process.env.DB_NAME || "hockey-app";

const associations = [
  {
    associationId: "ha",
    code: "HA",
    name: "Hockey Australia",
    fullName: "Hockey Australia Limited",
    level: 0,
    hierarchy: ["ha"],
    parentAssociationId: null,

    region: "National",
    state: "National",
    country: "Australia",

    address: {
      street: "123 National Way",
      suburb: "Melbourne",
      city: "Melbourne",
      state: "VIC",
      postcode: "3000",
      country: "Australia",
    },

    contact: {
      primaryEmail: "admin@hockey.org.au",
      phone: "1300 HOCKEY",
      website: "https://hockey.org.au",
    },

    socialMedia: {
      facebook: "https://facebook.com/HockeyAustralia",
      instagram: "https://instagram.com/hockeyaustralia",
      twitter: "https://twitter.com/HockeyAustralia",
    },

    positions: [
      {
        positionId: "pos-ceo",
        title: "Chief Executive Officer",
        displayName: "CEO",
        contactPerson: {
          name: "David Pryles",
          email: "ceo@hockey.org.au",
          phone: "1300 HOCKEY",
        },
        displayOrder: 1,
        isActive: true,
      },
    ],

    fees: [
      {
        feeId: "ha-junior-2024",
        name: "National Junior Levy",
        category: "Junior",
        amount: 30.0,
        gstIncluded: true,
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["junior"],
          roleCategories: ["Participant", "Playing"],
        },
        isActive: true,
      },
      {
        feeId: "ha-senior-2024",
        name: "National Senior Levy",
        category: "Senior",
        amount: 40.0,
        gstIncluded: true,
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["senior"],
          roleCategories: ["Participant", "Playing"],
        },
        isActive: true,
      },
    ],

    settings: {
      requiresApproval: false,
      autoApproveReturningPlayers: true,
      allowMultipleClubs: true,
      seasonStartMonth: 1,
      seasonEndMonth: 12,
      requiresClearance: false,
      requiresInsurance: true,
      requiresMedicalInfo: true,
      requiresEmergencyContact: true,
    },

    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Hockey Queensland
  {
    associationId: "hq",
    code: "HQ",
    name: "Hockey Queensland",
    fullName: "Hockey Queensland Inc.",
    level: 1,
    hierarchy: ["ha", "hq"],
    parentAssociationId: "ha",

    region: "Queensland",
    state: "QLD",
    country: "Australia",

    address: {
      street: "456 State Street",
      suburb: "Brisbane",
      city: "Brisbane",
      state: "QLD",
      postcode: "4000",
      country: "Australia",
    },

    contact: {
      primaryEmail: "admin@hockeyqld.org.au",
      phone: "07 3000 0000",
      website: "https://hockeyqld.org.au",
    },

    fees: [
      {
        feeId: "hq-junior-2024",
        name: "State Junior Levy",
        category: "Junior",
        amount: 50.0,
        gstIncluded: true,
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["junior"],
        },
        isActive: true,
      },
      {
        feeId: "hq-senior-2024",
        name: "State Senior Levy",
        category: "Senior",
        amount: 70.0,
        gstIncluded: true,
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["senior"],
        },
        isActive: true,
      },
    ],

    settings: {
      requiresApproval: false,
      autoApproveReturningPlayers: true,
      allowMultipleClubs: true,
      seasonStartMonth: 1,
      seasonEndMonth: 12,
      requiresClearance: false,
      requiresInsurance: true,
      requiresMedicalInfo: true,
      requiresEmergencyContact: true,
    },

    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Brisbane Hockey Association
  {
    associationId: "bha",
    code: "BHA",
    name: "Brisbane Hockey Association",
    fullName: "Brisbane Hockey Association Inc.",
    level: 2,
    hierarchy: ["ha", "hq", "bha"],
    parentAssociationId: "hq",

    region: "Brisbane",
    state: "QLD",
    country: "Australia",
    timezone: "Australia/Brisbane",

    address: {
      street: "789 Regional Road",
      suburb: "Brisbane",
      city: "Brisbane",
      state: "QLD",
      postcode: "4000",
      country: "Australia",
    },

    contact: {
      primaryEmail: "registrations@brisbanehockey.org.au",
      secondaryEmail: "admin@brisbanehockey.org.au",
      phone: "(07) 1234 5678",
      website: "https://brisbanehockey.org.au",
    },

    socialMedia: {
      facebook: "https://facebook.com/BrisbaneHockey",
      instagram: "https://instagram.com/brisbanehockey",
    },

    positions: [
      {
        positionId: "pos-president",
        title: "President",
        displayName: "President",
        displayOrder: 1,
        isActive: true,
      },
      {
        positionId: "pos-secretary",
        title: "Secretary",
        displayName: "Secretary",
        contactPerson: {
          name: "Secretary Contact",
          email: "secretary@brisbanehockey.org.au",
          phone: "(07) 1234 5678",
        },
        displayOrder: 2,
        isActive: true,
      },
      {
        positionId: "pos-registrar",
        title: "Registrar",
        displayName: "Registrar",
        contactPerson: {
          name: "Registrar Contact",
          email: "registrations@brisbanehockey.org.au",
          phone: "(07) 1234 5678",
        },
        displayOrder: 3,
        isActive: true,
      },
    ],

    fees: [
      {
        feeId: "bha-junior-2024",
        name: "Junior Registration",
        category: "Junior",
        amount: 150.0,
        gstIncluded: true,
        description: "Junior player registration for 2024 season",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["junior"],
          roleCategories: ["Participant", "Playing"],
          maxAge: 18,
        },
        isActive: true,
      },
      {
        feeId: "bha-senior-2024",
        name: "Senior Registration",
        category: "Senior",
        amount: 200.0,
        gstIncluded: true,
        description: "Senior player registration for 2024 season",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["senior"],
          roleCategories: ["Participant", "Playing"],
          minAge: 18,
        },
        isActive: true,
      },
      {
        feeId: "bha-masters-2024",
        name: "Masters Registration",
        category: "Masters",
        amount: 180.0,
        gstIncluded: true,
        description: "Masters player registration for 2024 season",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          ageCategories: ["masters"],
          roleCategories: ["Participant", "Playing"],
          minAge: 35,
        },
        isActive: true,
      },
      {
        feeId: "bha-umpire-2024",
        name: "Umpire Registration",
        category: "Official",
        amount: 50.0,
        gstIncluded: true,
        description: "Umpire registration for 2024 season",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2024-12-31"),
        appliesTo: {
          roleCategories: ["Official"],
        },
        isActive: true,
      },
    ],

    settings: {
      requiresApproval: false,
      autoApproveReturningPlayers: true,
      allowMultipleClubs: true,
      seasonStartMonth: 1,
      seasonEndMonth: 12,
      registrationOpenDate: new Date("2023-11-01"),
      registrationCloseDate: new Date("2024-03-31"),
      requiresClearance: true,
      requiresInsurance: true,
      requiresMedicalInfo: true,
      requiresEmergencyContact: true,
    },

    branding: {
      primaryColor: "#06054e",
      secondaryColor: "#FFD700",
    },

    metadata: {
      foundedYear: 1920,
      abn: "12 345 678 901",
    },

    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedAssociations() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Optional: clear existing associations
    // await db.collection("associations").deleteMany({});

    const result = await db.collection("associations").insertMany(associations);
    console.log(`Inserted ${result.insertedCount} associations`);
  } catch (err) {
    console.error("Error seeding associations:", err);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

seedAssociations();
