module.exports = [
  {
    eventId: "CHER-1986-0425-01",
    title: "Preparation for Safety Test on Reactor Unit 4",
    description: "Preparations begin for testing the turbogenerator rundown safety system under low-power operating conditions.",
    timestamp: new Date("1986-04-25T01:00:00Z"),
    category: "OPERATIONAL",
    isVerified: true,
    citations: [
      { sourceName: "IAEA INSAG-7 Summary Report", referenceId: "INSAG-7, Section 2.2", url: "https://www-pub.iaea.org/MTCD/publications/PDF/Pub913e_web.pdf" }
    ]
  },
  {
    eventId: "CHER-1986-0425-02",
    title: "Shutdown Postponed by Kiev Grid Controller",
    description: "The electricity grid controller in Kiev requests a delay in reactor shutdown due to high power demands across the region.",
    timestamp: new Date("1986-04-25T14:00:00Z"),
    category: "OPERATIONAL",
    isVerified: true,
    citations: [
      { sourceName: "Soviet State Committee Report", referenceId: "Vienna Conference Document 1986", url: "https://www.iaea.org/" }
    ]
  },
  {
    eventId: "CHER-1986-0426-01",
    title: "Power Surge and Steam Explosions",
    description: "A catastrophic power surge occurs during a low-power test, leading to rapid steam generation, rupture of fuel channels, and two massive explosions that destroy the reactor core.",
    timestamp: new Date("1986-04-26T01:23:45Z"),
    category: "ACCIDENT",
    isVerified: true,
    citations: [
      { sourceName: "IAEA INSAG-1 / INSAG-7", referenceId: "INSAG-7 Chapter 3", url: "https://www-pub.iaea.org/MTCD/publications/PDF/Pub913e_web.pdf" },
      { sourceName: "State Commission Chronology", referenceId: "Log-Entry-1986-04-26" }
    ]
  },
  {
    eventId: "CHER-1986-0426-02",
    title: "Initial Firefighter Deployment to Turbine Hall",
    description: "Varian Telyatnikov leads the first fire brigade units to extinguish fires on the roof of the turbine building and reactor block.",
    timestamp: new Date("1986-04-26T01:35:00Z"),
    category: "EMERGENCY_RESPONSE",
    isVerified: true,
    citations: [
      { sourceName: "Pripyat Fire Department Archive", referenceId: "Archive-Rec-86-04", url: "https://chnpp.gov.ua/en/" }
    ]
  }
];