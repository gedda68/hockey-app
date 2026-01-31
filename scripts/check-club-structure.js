// check-club-structure.js
// Check what fields your clubs actually have

print("\n🔍 Checking Club Structure\n");
print("=".repeat(50));

// Find your commercial hockey club
const club = db.clubs.findOne({ slug: "commercial-hockey-club" });

if (!club) {
  print("❌ Club not found with slug 'commercial-hockey-club'");
  print("\nAvailable clubs:");
  db.clubs.find({}).forEach((c) => {
    print(`  - ${c.slug || c.name}`);
  });
} else {
  print("\n✅ Club found!\n");
  print("Complete club document:");
  print(JSON.stringify(club, null, 2));

  print("\n" + "=".repeat(50));
  print("\nKey fields:");
  print(`  _id: ${club._id}`);
  print(`  id: ${club.id}`);
  print(`  clubId: ${club.clubId}`);
  print(`  slug: ${club.slug}`);
  print(`  name: ${club.name}`);

  print("\n" + "=".repeat(50));
  print("\n🔍 Checking Members\n");

  const members = db.members.find({ memberId: /^CHC-/ }).limit(3).toArray();

  if (members.length > 0) {
    print(
      `Found ${db.members.countDocuments({ memberId: /^CHC-/ })} CHC members\n`
    );
    print("Sample member clubId values:");
    members.forEach((m) => {
      print(`  ${m.memberId}: clubId = ${m.clubId}`);
    });

    print("\n" + "=".repeat(50));
    print("\n📊 Field Comparison:\n");

    const memberClubId = members[0].clubId;
    print(`Member's clubId: ${memberClubId}`);
    print(`Club's _id:      ${club._id}`);
    print(`Club's id:       ${club.id}`);
    print(`Club's clubId:   ${club.clubId}`);

    print("\n" + "=".repeat(50));
    print("\n✅ Match Analysis:\n");

    if (memberClubId === club._id?.toString()) {
      print("✅ Members use club._id");
    } else if (memberClubId === club.id) {
      print("✅ Members use club.id");
    } else if (memberClubId === club.clubId) {
      print("✅ Members use club.clubId");
    } else {
      print("⚠️  No match found!");
      print("   Member clubId doesn't match any club field");
    }
  } else {
    print("No CHC members found");
  }
}

print("\n");
