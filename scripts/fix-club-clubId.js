// fix-club-clubId.js
// Run with: mongosh hockey-app fix-club-clubId.js

// Find the club
const club = db.clubs.findOne({ slug: "commercial-hockey-club" });

print("Current club document:");
printjson(club);

if (!club) {
  print("❌ ERROR: Club not found!");
  quit(1);
}

if (!club.clubId) {
  print("\n⚠️ Club is missing clubId field");
  print("This needs to be fixed!\n");

  // Check what clubId the members are using
  const members = db.members.find({ memberId: /^CHC-/ }).toArray();

  if (members.length === 0) {
    print("No CHC members found");
  } else {
    const clubIds = [...new Set(members.map((m) => m.clubId))];
    print(`Found ${members.length} CHC members using these clubIds:`);
    clubIds.forEach((id) => {
      const count = members.filter((m) => m.clubId === id).length;
      print(`  - ${id}: ${count} members`);
    });

    if (clubIds.length === 1) {
      const correctClubId = clubIds[0];
      print(`\n✅ All members use the same clubId: ${correctClubId}`);
      print("\nUpdating club document...");

      const result = db.clubs.updateOne(
        { slug: "commercial-hockey-club" },
        { $set: { clubId: correctClubId } }
      );

      if (result.modifiedCount === 1) {
        print("✅ SUCCESS: Club updated with clubId:", correctClubId);

        const updatedClub = db.clubs.findOne({
          slug: "commercial-hockey-club",
        });
        print("\nUpdated club document:");
        printjson(updatedClub);
      } else {
        print("❌ ERROR: Failed to update club");
      }
    } else {
      print("\n⚠️ WARNING: Members have different clubIds!");
      print("Manual intervention required.");
    }
  }
} else {
  print("\n✅ Club already has clubId:", club.clubId);
}
