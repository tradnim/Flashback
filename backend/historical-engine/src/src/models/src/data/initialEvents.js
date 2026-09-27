module.exports = [
  {
    eventId: "CHER-1986-0425-01",
    title: "Preparation for Safety Test on Reactor Unit 4",
    description: "Preparations begin for testing the turbogenerator rundown safety system under low-power operating conditions.",
    timestamp: new Date("1986-04-25T01:00:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
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
    importance: "High",
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
    importance: "Critical",
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
    importance: "High",
    isVerified: true,
    citations: [
      { sourceName: "Pripyat Fire Department Archive", referenceId: "Archive-Rec-86-04", url: "https://chnpp.gov.ua/en/" }
    ]
  },
  {
    eventId: "CHER-EVT-001",
    title: "Initiation of Reactor Power Reduction",
    description: "Operators at Chernobyl Unit 4 begin steadily reducing thermal power from its full nominal output of 3200 MWt in preparation for the turbo-generator safety test.",
    timestamp: new Date("1986-04-25T01:06:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1 - Chronology" }]
  },
  {
    eventId: "CHER-EVT-002",
    title: "Interruption of Power Reduction by Grid Controller",
    description: "At the request of the Kiev electrical grid controller, power reduction is halted at 1600 MWt to satisfy high daytime electricity demands, delaying the test sequence by nine hours.",
    timestamp: new Date("1986-04-25T14:00:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1 - Chronology" }]
  },
  {
    eventId: "CHER-EVT-003",
    title: "Emergency Core Cooling System (ECCS) Disconnected",
    description: "In accordance with the preparation steps for the turbine coastdown test, the ECCS is isolated from the primary loop to prevent it from interfering with or tripping during the experiment.",
    timestamp: new Date("1986-04-25T14:00:00Z"),
    category: "SAFETY",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "Official Soviet Report", referenceId: "Annex I, State Commission Findings" }]
  },
  {
    eventId: "CHER-EVT-004",
    title: "Resumption of Power Decrease",
    description: "The Kiev grid controller finally grants permission to resume lowering reactor power, initiating a rapid power drop during a period when xenon-135 poisoning begins to rapidly accumulate in the core.",
    timestamp: new Date("1986-04-25T23:00:00Z"),
    category: "OPERATIONAL",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-005",
    title: "Midnight Shift Turnover",
    description: "The night shift takes over control of Unit 4 under shift supervisor Anatoly Dyatlov. Aleksandr Akimov and Leonid Toptunov take up duties at the main control room panels.",
    timestamp: new Date("1986-04-26T00:00:00Z"),
    category: "OPERATIONAL",
    importance: "Low",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Annex I" }]
  },
  {
    eventId: "CHER-EVT-006",
    title: "Uncontrolled Power Drop to Near-Stall",
    description: "Due to an operator error or automated system interaction following a manual control rod adjustment, reactor power plummets drastically down to approximately 30 MWt, threatening complete core stall.",
    timestamp: new Date("1986-04-26T00:28:00Z"),
    category: "ACCIDENT",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.2" }]
  },
  {
    eventId: "CHER-EVT-007",
    title: "Emergency Manual Recovery of Control Rods",
    description: "Operators frantically pull out manual control rods to reverse the power drop, stabilizing core output at roughly 200 MWt against intense xenon poisoning.",
    timestamp: new Date("1986-04-26T01:00:00Z"),
    category: "OPERATIONAL",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-008",
    title: "Computer Warnings Overridden",
    description: "The SKALA central process computer issues warnings regarding dangerously low operating reactivity margins (ORM), which Dyatlov and the team ignore to proceed with the test.",
    timestamp: new Date("1986-04-26T01:19:00Z"),
    category: "SAFETY",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 5.2" }]
  },
  {
    eventId: "CHER-EVT-009",
    title: "Additional Main Circulation Pumps Activated",
    description: "To comply with the test design parameters for coolant flow rates, extra main circulation pumps are switched on, causing total coolant flow rates to exceed normal limits and increasing void vulnerability.",
    timestamp: new Date("1986-04-26T01:22:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-010",
    title: "Critical Reactivity Margin Deficit Reached",
    description: "Calculations post-accident verify that the operating reactivity margin at this moment fell to the equivalent of just 8 manual control rods—well below the absolute safety limit of 15.",
    timestamp: new Date("1986-04-26T01:22:30Z"),
    category: "SAFETY",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 2.5" }]
  },
  {
    eventId: "CHER-EVT-011",
    title: "Initiation of the Turbine Coastdown Test",
    description: "Steam supply to turbine generator No. 8 is shut off, triggering the test sequence as the four main circulation pumps transition to run down on the electrical power generated by the slowing turbine.",
    timestamp: new Date("1986-04-26T01:23:04Z"),
    category: "ACCIDENT",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-012",
    title: "Rapid Void Formation in Core Channels",
    description: "As the turbine-driven pumps slow down, coolant flow rate drops and water begins to boil at the bottom of the core, rapidly generating steam voids that accelerate reactivity due to the RBMK positive void coefficient.",
    timestamp: new Date("1986-04-26T01:23:35Z"),
    category: "ACCIDENT",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 2.1" }]
  },
  {
    eventId: "CHER-EVT-013",
    title: "Triggering of Emergency Protection Signals",
    description: "Power excursion rate protection signals register as core thermal power surges past 530 MWt and escalates uncontrollably upward.",
    timestamp: new Date("1986-04-26T01:23:43Z"),
    category: "ACCIDENT",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-014",
    title: "Emergency AZ-5 Button Pressed",
    description: "Sensing an uncontrolled excursion, senior reactor control operator Leonid Toptunov depresses the AZ-5 emergency protection button to drop all control and safety rods back into the core.",
    timestamp: new Date("1986-04-26T01:23:40Z"),
    category: "SAFETY",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-015",
    title: "Control Rod Jamming and Core Destruction",
    description: "Due to the unique design featuring graphite displacer tips and warped channels from intense thermal shock, inserting the control rods initially displaces coolant water, spiking reactivity further and jamming the rods halfway down.",
    timestamp: new Date("1986-04-26T01:23:44Z"),
    category: "ACCIDENT",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 2.2" }]
  },
  {
    eventId: "CHER-EVT-016",
    title: "Catastrophic Twin Explosions",
    description: "Runaway thermal energy triggers massive steam and zircaloy-water hydrogen explosions. The 1,000-ton biological shield ('E-Plate') is blown into the air, destroying the reactor roof and exposing the glowing core to the atmosphere.",
    timestamp: new Date("1986-04-26T01:23:58Z"),
    category: "ACCIDENT",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-017",
    title: "Initial Arrival of Plant Fire Brigade",
    description: "A first response team of 14 professional firemen under Lieutenant Vladimir Pravik arrives at Unit 4 to combat raging fires on the exterior and roof structures.",
    timestamp: new Date("1986-04-26T01:28:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "Official Soviet Log", referenceId: "Fire Department Dispatch Records" }]
  },
  {
    eventId: "CHER-EVT-018",
    title: "Localization of Roof Fires on Units 3 and 4",
    description: "Firefighting reinforcements from Pripyat scale the turbine hall roof, successfully containing fires burning on the bitumen surfaces of adjacent structures.",
    timestamp: new Date("1986-04-26T02:10:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Annex I" }]
  },
  {
    eventId: "CHER-EVT-019",
    title: "Unit 3 Reactor Manual Shutdown",
    description: "Operators shut down neighboring Reactor Unit 3 out of safety precautions due to heavy structural damage and radioactive smoke blowing across the ventilation intakes.",
    timestamp: new Date("1986-04-26T05:00:00Z"),
    category: "OPERATIONAL",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-020",
    title: "Extinguishment of Open Structural Blazes",
    description: "Most major open fires across the complex are brought under control, though a high-temperature graphite fire within the exposed reactor core continues to burn and vent radioactive fission products.",
    timestamp: new Date("1986-04-26T05:00:00Z"),
    category: "RADIOLOGICAL",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-021",
    title: "Emergency Water Injection Attempts",
    description: "Operators attempt to feed emergency cooling water directly into the wrecked core via emergency feedwater lines, though much of the water escapes or flows toward unaffected units.",
    timestamp: new Date("1986-04-26T08:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-022",
    title: "Units 1 and 2 Shut Down",
    description: "In response to mounting radiation alarms and administrative orders, reactors 1 and 2 at the Chernobyl station are systematically shut down.",
    timestamp: new Date("1986-04-27T08:00:00Z"),
    category: "OPERATIONAL",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-023",
    title: "Evacuation of Pripyat Announced",
    description: "Following a 36-hour silence, Soviet state authorities mobilize a massive fleet of buses to evacuate all 45,000+ residents of Pripyat and surrounding towns within a 10-kilometer exclusion radius.",
    timestamp: new Date("1986-04-27T14:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "State Commission Records", referenceId: "Evacuation Decree #383" }]
  },
  {
    eventId: "CHER-EVT-024",
    title: "Commencement of Aerial Material Dumping",
    description: "Military helicopter pilots begin flying sorting missions over the open core crater, dropping thousands of tons of boron, lead, dolomite, clay, and sand to suppress radiation and choke the graphite fire.",
    timestamp: new Date("1986-04-28T06:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-025",
    title: "International Detection of Plume Fallout",
    description: "Forsmark Nuclear Power Plant in Sweden detects abnormal radioactive isotopes on worker clothing, prompting international inquiries that force the Soviet Union to publicly acknowledge the accident.",
    timestamp: new Date("1986-04-28T10:00:00Z"),
    category: "RADIOLOGICAL",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "IAEA Incident Log", referenceId: "Nordic Radiological Report" }]
  },
  {
    eventId: "CHER-EVT-026",
    title: "Establishment of the 30-Kilometer Exclusion Zone",
    description: "The Soviet government formally expands the evacuation perimeter, mandating the permanent clearance of all inhabitants within a 30-kilometer radius around the stricken power facility.",
    timestamp: new Date("1986-05-02T00:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "Government Commission", referenceId: "Exclusion Zone Mandate" }]
  },
  {
    eventId: "CHER-EVT-027",
    title: "Installation of Nitrogen Cooling Blanket System",
    description: "Engineers complete a specialized feed system to pump cold nitrogen gas beneath the reactor core to cool residual mass and prevent oxygen ignition.",
    timestamp: new Date("1986-05-05T12:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-028",
    title: "Sharp Drop in Radionuclide Release Rates",
    description: "Combined cooling measures, nitrogen injection, and material drops result in a sharp reduction in core temperatures and overall atmospheric radionuclide emission.",
    timestamp: new Date("1986-05-06T18:00:00Z"),
    category: "RADIOLOGICAL",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "IAEA INSAG-7", referenceId: "Section 3.1" }]
  },
  {
    eventId: "CHER-EVT-029",
    title: "Completion of the Sub-Reactor Foundation Tunnel",
    description: "A team of roughly 400 miners completes a subterranean cooling tunnel beneath Unit 4 to construct a reinforced concrete slab designed to protect the water table from thermal meltdown.",
    timestamp: new Date("1986-05-10T00:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "World Nuclear Association", referenceId: "Appendix 1 - Engineering Phase" }]
  },
  {
    eventId: "CHER-EVT-030",
    title: "Establishment of the USSR Ministry of Atomic Energy",
    description: "In response to systemic institutional failures revealed by the disaster, state management structures for nuclear safety are reorganized under specialized ministerial oversight.",
    timestamp: new Date("1986-07-15T00:00:00Z"),
    category: "SAFETY",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "Soviet State Decree", referenceId: "Ministry Restructuring Act" }]
  },
  {
    eventId: "CHER-EVT-031",
    title: "Commencement of the 'Sarcophagus' (Object Shelter) Construction",
    description: "Large-scale civil engineering works begin to encase the remains of Reactor Unit 4 in a massive protective concrete and steel shelter to secure long-term containment.",
    timestamp: new Date("1986-09-01T00:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "Shelter Construction Log", referenceId: "Project Blueprint Alpha" }]
  },
  {
    eventId: "CHER-EVT-032",
    title: "Restart of Chernobyl Unit 1",
    description: "Following intense decontamination and safety upgrades to RBMK control specifications, Unit 1 is officially restarted to resume power generation for the region.",
    timestamp: new Date("1986-10-01T00:00:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "Plant Operations Log", referenceId: "Unit 1 Restart Authorization" }]
  },
  {
    eventId: "CHER-EVT-033",
    title: "Restart of Chernobyl Unit 2",
    description: "Unit 2 follows Unit 1 back into operational status after extensive cleaning and electronic modifications to its control framework.",
    timestamp: new Date("1986-11-05T00:00:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "Plant Operations Log", referenceId: "Unit 2 Commissioning Records" }]
  },
  {
    eventId: "CHER-EVT-034",
    title: "Completion of the Object Shelter (Sarcophagus)",
    description: "Builders finalize the 'Shelter' structure over Unit 4, sealing millions of tons of radioactive debris and remaining fuel inside a makeshift enclosure.",
    timestamp: new Date("1986-11-30T00:00:00Z"),
    category: "EMERGENCY_RESPONSE",
    importance: "High",
    isVerified: true,
    citations: [{ sourceName: "State Acceptance Commission", referenceId: "Object Shelter Sign-off" }]
  },
  {
    eventId: "CHER-EVT-035",
    title: "Restart of Chernobyl Unit 3",
    description: "The final operating reactor in the shared building complex, Unit 3, is thoroughly overhauled and reconnected to the electrical grid.",
    timestamp: new Date("1987-12-04T00:00:00Z"),
    category: "OPERATIONAL",
    importance: "Medium",
    isVerified: true,
    citations: [{ sourceName: "Plant Operations Log", referenceId: "Unit 3 Restart Report" }]
  },
  {
    eventId: "CHER-EVT-036",
    title: "Implementation of Nationwide RBMK Safety Modernizations",
    description: "All active RBMK reactors across the Soviet Union receive mandatory design overhauls—including altered control rod configurations and increased enrichment—to eliminate the positive void coefficient vulnerability.",
    timestamp: new Date("1988-06-30T00:00:00Z"),
    category: "SAFETY",
    importance: "Critical",
    isVerified: true,
    citations: [{ sourceName: "USSR State Safety Committee", referenceId: "RBMK Upgrade Directive 88" }]
  }
];