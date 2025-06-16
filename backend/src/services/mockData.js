/**
 * Mock data for the timataka scraper
 * Used as fallback when scraping fails
 */

// Sample race data
const mockRaces = [
  {
    id: "2025-reykjavik-marathon",
    name: "Reykjavik Marathon 2025",
    url: "https://timataka.net/2025-reykjavik-marathon"
  },
  {
    id: "2025-akureyri-10k",
    name: "Akureyri 10K 2025",
    url: "https://timataka.net/2025-akureyri-10k"
  },
  {
    id: "2025-iceland-half-marathon",
    name: "Iceland Half Marathon 2025",
    url: "https://timataka.net/2025-iceland-half-marathon"
  }
];

// Sample race results
const mockRaceResults = [
  {
    id: "runner-1",
    position: "1",
    name: "Jón Jónsson",
    bib: "101",
    club: "Reykjavik Running Club",
    category: "M35-39",
    time: "02:45:33",
    raceId: "2025-reykjavik-marathon",
    raceName: "Reykjavik Marathon 2025",
  },
  {
    id: "runner-2",
    position: "2",
    name: "Guðrún Guðmundsdóttir",
    bib: "102",
    club: "Breiðablik",
    category: "F30-34",
    time: "02:48:14",
    raceId: "2025-reykjavik-marathon",
    raceName: "Reykjavik Marathon 2025"
  },
  {
    id: "runner-3",
    position: "3",
    name: "Björn Gunnarsson",
    bib: "103",
    club: "ÍR",
    category: "M25-29",
    time: "02:50:45",
    raceId: "2025-reykjavik-marathon",
    raceName: "Reykjavik Marathon 2025"
  },
  {
    id: "runner-4",
    position: "4",
    name: "Anna Kristinsdóttir",
    bib: "104",
    club: "KR",
    category: "F25-29",
    time: "02:53:21",
    raceId: "2025-reykjavik-marathon",
    raceName: "Reykjavik Marathon 2025"
  },
  {
    id: "runner-5",
    position: "5",
    name: "Sigurður Ólafsson",
    bib: "105",
    club: "Fjölnir",
    category: "M40-44",
    time: "02:55:12",
    raceId: "2025-reykjavik-marathon",
    raceName: "Reykjavik Marathon 2025"
  },
  {
    id: "runner-6",
    position: "1",
    name: "Elín Halldórsdóttir",
    bib: "201",
    club: "UFA",
    category: "F20-24",
    time: "00:37:22",
    raceId: "2025-akureyri-10k",
    raceName: "Akureyri 10K 2025"
  },
  {
    id: "runner-7",
    position: "2",
    name: "Þór Arnarsson",
    bib: "202",
    club: "Þór",
    category: "M20-24",
    time: "00:38:15",
    raceId: "2025-akureyri-10k",
    raceName: "Akureyri 10K 2025"
  }
];

// Sample contestant details
const mockContestantDetails = {
  id: "runner-1",
  name: "Jón Jónsson",
  bib: "101",
  category: "M35-39",
  club: "Reykjavik Running Club",
  finalTime: "02:45:33",
  timeSplits: [
    {
      checkpoint: "5km",
      distance: "5km",
      splitTime: "00:18:45",
      time: "00:18:45",
      position: "2"
    },
    {
      checkpoint: "10km",
      distance: "10km",
      splitTime: "00:19:12",
      time: "00:37:57",
      position: "1"
    },
    {
      checkpoint: "Half",
      distance: "21.1km",
      splitTime: "00:41:05",
      time: "01:19:02",
      position: "1"
    },
    {
      checkpoint: "30km",
      distance: "30km",
      splitTime: "00:37:47",
      time: "01:56:49",
      position: "1"
    },
    {
      checkpoint: "Finish",
      distance: "42.2km",
      splitTime: "00:48:44",
      time: "02:45:33",
      position: "1"
    }
  ],
  totalCheckpoints: 5,
  lastUpdate: new Date().toISOString(),
  status: "Finished"
};

// Function to generate search results from mock race results
const searchMockContestants = (query) => {
  // Normalize Icelandic characters for case-insensitive search
  const normalizeText = (text) => {
    return text.toLowerCase()
      .replace(/ó/g, 'o')
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ú/g, 'u')
      .replace(/ý/g, 'y')
      .replace(/þ/g, 'th')
      .replace(/æ/g, 'ae')
      .replace(/ö/g, 'o')
      .replace(/ð/g, 'd');
  };
  
  const normalizedQuery = normalizeText(query);
  
  return mockRaceResults.filter(contestant => {
    const normalizedName = normalizeText(contestant.name);
    const normalizedClub = normalizeText(contestant.club || '');
    
    return normalizedName.includes(normalizedQuery) || 
           normalizedClub.includes(normalizedQuery) ||
           contestant.name.toLowerCase().includes(query.toLowerCase()) ||
           (contestant.club && contestant.club.toLowerCase().includes(query.toLowerCase()));
  });
};

// Function to get a contestant by ID
const getMockContestantById = (id) => {
  if (id === "runner-1") {
    return mockContestantDetails;
  }
  
  const contestant = mockRaceResults.find(c => c.id === id);
  if (!contestant) return null;
  
  return {
    id: contestant.id,
    name: contestant.name,
    bib: contestant.bib,
    category: contestant.category,
    club: contestant.club,
    finalTime: contestant.time,
    timeSplits: [
      {
        checkpoint: "Finish",
        distance: contestant.raceId.includes("marathon") ? "42.2km" : "10km",
        splitTime: contestant.time,
        time: contestant.time,
        position: contestant.position
      }
    ],
    totalCheckpoints: 1,
    lastUpdate: new Date().toISOString(),
    status: "Finished"
  };
};

module.exports = {
  mockRaces,
  mockRaceResults,
  mockContestantDetails,
  searchMockContestants,
  getMockContestantById
};
