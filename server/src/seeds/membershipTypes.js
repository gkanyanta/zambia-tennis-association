import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MembershipType from '../models/MembershipType.js';

dotenv.config();

const membershipTypes = [
  // Player ZPIN memberships
  {
    name: 'Junior ZPIN',
    code: 'zpin_junior',
    description: 'Annual player registration for juniors (under 18). Required for tournament participation.',
    category: 'player',
    amount: 100,
    currency: 'ZMW',
    sortOrder: 1,
    isActive: true,
    maxAge: 17,
    benefits: [
      'Official ZPIN number',
      'Tournament eligibility',
      'National ranking inclusion',
      'Junior development programs access'
    ]
  },
  {
    name: 'Senior ZPIN',
    code: 'zpin_senior',
    description: 'Annual player registration for adults (18+). Required for tournament participation.',
    category: 'player',
    amount: 250,
    currency: 'ZMW',
    sortOrder: 2,
    isActive: true,
    minAge: 18,
    benefits: [
      'Official ZPIN number',
      'Tournament eligibility',
      'National ranking inclusion',
      'League participation rights',
      'Voting rights at AGM'
    ]
  },
  {
    name: 'International ZPIN',
    code: 'zpin_international',
    description: 'Annual registration for international players residing in Zambia.',
    category: 'player',
    amount: 500,
    currency: 'ZMW',
    sortOrder: 3,
    isActive: true,
    benefits: [
      'Official ZPIN number',
      'Tournament eligibility',
      'National ranking inclusion',
      'League participation rights',
      'International transfer documentation'
    ]
  },
  // Club affiliation memberships
  {
    name: 'Standard Club Affiliation',
    code: 'club_standard',
    description: 'Annual club affiliation for standard tennis clubs.',
    category: 'club',
    amount: 2000,
    currency: 'ZMW',
    sortOrder: 1,
    isActive: true,
    benefits: [
      'Official ZTA affiliation',
      'League participation rights',
      'Tournament hosting eligibility',
      'Club listing on ZTA website',
      'Voting rights at AGM'
    ]
  },
  {
    name: 'Premium Club Affiliation',
    code: 'club_premium',
    description: 'Annual club affiliation for premium/larger tennis clubs with additional benefits.',
    category: 'club',
    amount: 3000,
    currency: 'ZMW',
    sortOrder: 2,
    isActive: true,
    benefits: [
      'Official ZTA affiliation',
      'League participation rights',
      'Priority tournament hosting',
      'Featured club listing on ZTA website',
      'Multiple voting rights at AGM',
      'Coach certification support',
      'Equipment procurement assistance'
    ]
  }
];

const seedMembershipTypes = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing membership types (optional - comment out to preserve existing)
    // await MembershipType.deleteMany({});
    // console.log('Cleared existing membership types');

    // Upsert each membership type
    for (const type of membershipTypes) {
      const result = await MembershipType.findOneAndUpdate(
        { code: type.code },
        type,
        { upsert: true, new: true }
      );
      console.log(`Upserted: ${result.name} (${result.code}) - K${result.amount}`);
    }

    console.log('\\nMembership types seeded successfully!');
    console.log('\\nSummary:');

    const playerTypes = await MembershipType.find({ category: 'player', isActive: true });
    const clubTypes = await MembershipType.find({ category: 'club', isActive: true });

    console.log('\\nPlayer Memberships (ZPIN):');
    playerTypes.forEach(t => console.log(`  - ${t.name}: K${t.amount}`));

    console.log('\\nClub Affiliations:');
    clubTypes.forEach(t => console.log(`  - ${t.name}: K${t.amount}`));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding membership types:', error);
    process.exit(1);
  }
};

seedMembershipTypes();
