import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import ExecutiveMember from '../models/ExecutiveMember.js';
import Affiliation from '../models/Affiliation.js';
import AboutContent from '../models/AboutContent.js';

// Load env vars
dotenv.config();

const executiveMembers = [
  {
    name: 'Lighton Musonda',
    position: 'President',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=LM',
    region: 'national',
    displayOrder: 1,
    bio: 'Leading the transformation and development of tennis in Zambia.',
    isActive: true
  },
  {
    name: 'Cornelius Simuchimba',
    position: 'Senior Vice President',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=CS',
    region: 'national',
    displayOrder: 2,
    bio: 'Supporting the president in strategic initiatives and governance.',
    isActive: true
  },
  {
    name: 'Joe Siame',
    position: 'General Secretary',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=JS',
    region: 'national',
    displayOrder: 3,
    bio: 'Managing administrative operations and member services.',
    isActive: true
  },
  {
    name: 'Ernest Shamano',
    position: 'Treasurer',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=ES',
    region: 'national',
    displayOrder: 4,
    bio: 'Overseeing financial management and fiscal responsibility.',
    isActive: true
  },
  {
    name: 'Napoleon Mweetwa',
    position: 'Vice President North',
    profileImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=NM',
    region: 'northern',
    displayOrder: 5,
    bio: 'Coordinating tennis development in the Northern region.',
    isActive: true
  },
  {
    name: 'Ignatius Mwape',
    position: 'Vice President South',
    profileImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=IM',
    region: 'southern',
    displayOrder: 6,
    bio: 'Coordinating tennis development in the Southern region.',
    isActive: true
  },
  {
    name: 'Teddy Chambisha',
    position: 'Officiating Coordinator',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=TC',
    region: 'national',
    displayOrder: 7,
    bio: 'Training and managing tennis officials nationwide.',
    isActive: true
  },
  {
    name: 'Patulani Jere',
    position: 'Sponsorship Coordinator',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=PJ',
    region: 'national',
    displayOrder: 8,
    bio: 'Securing partnerships and sponsorships for ZTA programs.',
    isActive: true
  },
  {
    name: 'Emmanuel Chewe',
    position: 'Junior Programmes Coordinator',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=EC',
    region: 'national',
    displayOrder: 9,
    bio: 'Developing and overseeing junior tennis programs.',
    isActive: true
  },
  {
    name: 'Maggie Mutale',
    position: 'Womens\' Coordinator',
    profileImage: 'https://via.placeholder.com/400x400/EC4899/FFFFFF?text=MM',
    region: 'national',
    displayOrder: 10,
    bio: 'Promoting and developing women\'s tennis in Zambia.',
    isActive: true
  },
  {
    name: 'Chilito Zulu',
    position: 'Veterans Coordinator',
    profileImage: 'https://via.placeholder.com/400x400/0EA5E9/FFFFFF?text=CZ',
    region: 'national',
    displayOrder: 11,
    bio: 'Organizing veteran tennis programs and events.',
    isActive: true
  },
  {
    name: 'Lwanga Lumbeta',
    position: 'Vice Junior Programmes Coordinator North',
    profileImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=LL',
    region: 'northern',
    displayOrder: 12,
    bio: 'Supporting junior development in the Northern region.',
    isActive: true
  },
  {
    name: 'Sylvester Ntumba',
    position: 'Vice Junior Programmes Coordinator South',
    profileImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=SN',
    region: 'southern',
    displayOrder: 13,
    bio: 'Supporting junior development in the Southern region.',
    isActive: true
  },
  {
    name: 'Gerald Kanyanta',
    position: 'Vice General Secretary North',
    profileImage: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=GK',
    region: 'northern',
    displayOrder: 14,
    bio: 'Assisting with administrative operations in the North.',
    isActive: true
  },
  {
    name: 'Revai Phakati',
    position: 'Vice General Secretary South',
    profileImage: 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=RP',
    region: 'southern',
    displayOrder: 15,
    bio: 'Assisting with administrative operations in the South.',
    isActive: true
  }
];

const affiliations = [
  {
    name: 'International Tennis Federation',
    acronym: 'ITF',
    logo: 'https://via.placeholder.com/300x300/FFFFFF/0EA5E9?text=ITF',
    websiteUrl: 'https://www.itftennis.com',
    category: 'international',
    displayOrder: 1,
    description: 'The governing body of world tennis, responsible for international competitions.',
    isActive: true
  },
  {
    name: 'Confederation of African Tennis',
    acronym: 'CAT',
    logo: 'https://via.placeholder.com/300x300/FFFFFF/10B981?text=CAT',
    websiteUrl: 'https://www.caftenis.com',
    category: 'continental',
    displayOrder: 2,
    description: 'The governing body for tennis in Africa, promoting the sport across the continent.',
    isActive: true
  },
  {
    name: 'National Olympic Committee of Zambia',
    acronym: 'NOCZ',
    logo: 'https://via.placeholder.com/300x300/FFFFFF/EC4899?text=NOCZ',
    websiteUrl: 'https://www.nocz.org.zm',
    category: 'national',
    displayOrder: 3,
    description: 'Zambia\'s Olympic committee, supporting athletes and sports development.',
    isActive: true
  },
  {
    name: 'National Sports Council of Zambia',
    acronym: 'NSCZ',
    logo: 'https://via.placeholder.com/300x300/FFFFFF/F59E0B?text=NSCZ',
    websiteUrl: 'https://www.nscz.org.zm',
    category: 'national',
    displayOrder: 4,
    description: 'Government body regulating and promoting sports in Zambia.',
    isActive: true
  }
];

const aboutContent = [
  {
    section: 'about',
    title: 'About the Zambia Tennis Association',
    content: `
      <p>The Zambia Tennis Association (ZTA) is the official governing body for tennis in Zambia, dedicated to promoting, developing, and managing the sport across the nation. Established with a mission to make tennis accessible to all Zambians, we work tirelessly to create opportunities for players of all ages and skill levels.</p>
      <p>Through our comprehensive programs, world-class facilities, and dedicated leadership, we strive to elevate Zambian tennis on the international stage while fostering a love for the game at the grassroots level.</p>
    `
  },
  {
    section: 'mission',
    title: 'Our Mission',
    content: `
      <p>To promote, develop, and govern tennis in Zambia through inclusive programs, excellent facilities, transparent administration, and strong partnerships that create opportunities for all Zambians to participate and excel in the sport.</p>
    `
  },
  {
    section: 'vision',
    title: 'Our Vision',
    content: `
      <p>To be the leading tennis nation in Southern Africa, producing world-class players, providing opportunities for all Zambians to enjoy tennis, and contributing to the social and economic development of our communities through sport.</p>
    `
  },
  {
    section: 'history',
    title: 'Our History',
    content: `
      <p>The Zambia Tennis Association has a rich history dating back several decades. Founded to organize and promote tennis throughout Zambia, we have grown from a small group of tennis enthusiasts to a nationwide organization serving thousands of players, coaches, and officials.</p>
      <p>Over the years, we have achieved significant milestones including joining the International Tennis Federation (ITF), hosting international tournaments, establishing junior development programs, and building state-of-the-art tennis facilities across the country.</p>
      <p>Today, we continue to build on this legacy, working towards our vision of making Zambia a powerhouse in African tennis while ensuring that tennis remains accessible to all who wish to play.</p>
    `
  },
  {
    section: 'objectives',
    title: 'Our Objectives',
    content: `
      <ul>
        <li>Develop and implement comprehensive tennis programs for all age groups and skill levels</li>
        <li>Identify, nurture, and support talented players to compete at national and international levels</li>
        <li>Establish and maintain world-class tennis facilities across Zambia</li>
        <li>Train and certify coaches and officials to the highest international standards</li>
        <li>Promote tennis as a tool for social development, education, and healthy living</li>
        <li>Strengthen partnerships with local and international organizations</li>
        <li>Ensure transparent and accountable governance of tennis in Zambia</li>
        <li>Increase participation in tennis, especially among youth and women</li>
      </ul>
    `
  }
];

const seedAboutPage = async () => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Clearing existing data...');
    await ExecutiveMember.deleteMany({});
    await Affiliation.deleteMany({});
    await AboutContent.deleteMany({});

    console.log('Seeding executive members...');
    await ExecutiveMember.insertMany(executiveMembers);
    console.log(`✓ Added ${executiveMembers.length} executive members`);

    console.log('Seeding affiliations...');
    await Affiliation.insertMany(affiliations);
    console.log(`✓ Added ${affiliations.length} affiliations`);

    console.log('Seeding about content...');
    await AboutContent.insertMany(aboutContent);
    console.log(`✓ Added ${aboutContent.length} content sections`);

    console.log('\n✅ About page seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- ${executiveMembers.length} Executive Members`);
    console.log(`- ${affiliations.length} Affiliations`);
    console.log(`- ${aboutContent.length} Content Sections`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding about page data:', error);
    process.exit(1);
  }
};

seedAboutPage();
