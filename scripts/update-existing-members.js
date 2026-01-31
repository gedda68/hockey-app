// update-existing-members.js
// One-time script to update existing members to use club._id

print("\n🔄 Updating existing members to use club._id\n");
print("=".repeat(50));

// Get all clubs
const clubs = db.clubs.find({}).toArray();

print(`\nFound ${clubs.length} clubs\n`);

let totalUpdated = 0;

clubs.forEach((club) => {
  print(`\n📍 Processing club: ${club.name}`);
  print(`   Slug: ${club.slug}`);
  print(`   _id: ${club._id.toString()}`);

  // Get club's short name for member ID prefix
  const clubShortName =
    club.shortName || club.slug.substring(0, 3).toUpperCase();
  const memberPattern = new RegExp(`^${clubShortName}-`);

  // Find members with this club's prefix
  const members = db.members.find({ memberId: memberPattern }).toArray();

  if (members.length === 0) {
    print(`   ℹ️  No members found with prefix ${clubShortName}-`);
    return;
  }

  print(`   Found ${members.length} members`);

  // Check current clubId values
  const uniqueClubIds = [...new Set(members.map((m) => m.clubId))];
  print(`   Current clubId values: ${uniqueClubIds.join(", ")}`);

  // Update all members to use club._id
  const result = db.members.updateMany(
    { memberId: memberPattern },
    { $set: { clubId: club._id.toString() } }
  );

  print(`   ✅ Updated ${result.modifiedCount} members`);
  totalUpdated += result.modifiedCount;
});

print("\n" + "=".repeat(50));
print(`\n✅ Total members updated: ${totalUpdated}\n`);

// Verify the update
print("Verifying updates...\n");
clubs.forEach((club) => {
  const count = db.members.countDocuments({ clubId: club._id.toString() });
  if (count > 0) {
    print(`  ${club.slug}: ${count} members`);
  }
});

print("\n✅ Done!\n");
