// add-member-id-index.js
// Add unique index on memberId field to prevent duplicates

print("\n🔧 Adding Unique Index to members.memberId\n");
print("=".repeat(50));

// Check if index already exists
const existingIndexes = db.members.getIndexes();
const hasIndex = existingIndexes.some(
  (idx) => idx.key && idx.key.memberId === 1
);

if (hasIndex) {
  print("\n✅ Index on memberId already exists\n");
  print("Existing indexes:");
  existingIndexes.forEach((idx) => {
    if (idx.key && idx.key.memberId) {
      print(`  - ${JSON.stringify(idx.key)} ${idx.unique ? "(unique)" : ""}`);
    }
  });
} else {
  print("\n📝 Creating unique index on memberId...\n");

  try {
    const result = db.members.createIndex(
      { memberId: 1 },
      {
        unique: true,
        name: "memberId_unique",
      }
    );

    print(`✅ Index created successfully: ${result}\n`);

    // Verify
    const indexes = db.members.getIndexes();
    print("Current indexes:");
    indexes.forEach((idx) => {
      print(
        `  - ${JSON.stringify(idx.key)} ${idx.unique ? "(unique)" : ""} ${
          idx.name ? `[${idx.name}]` : ""
        }`
      );
    });
  } catch (error) {
    print(`\n❌ Error creating index: ${error.message}\n`);

    if (error.code === 11000) {
      print("⚠️ Duplicate memberId values exist in database!");
      print("\nFinding duplicates...\n");

      const duplicates = db.members
        .aggregate([
          { $group: { _id: "$memberId", count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray();

      if (duplicates.length > 0) {
        print(`Found ${duplicates.length} duplicate memberId values:\n`);
        duplicates.forEach((dup) => {
          print(`  ${dup._id}: ${dup.count} occurrences`);
        });

        print("\n⚠️ Fix duplicates before creating unique index!");
        print("Run this to see the duplicate members:\n");
        duplicates.forEach((dup) => {
          print(`  db.members.find({ memberId: "${dup._id}" })`);
        });
      }
    }
  }
}

print("\n" + "=".repeat(50) + "\n");
