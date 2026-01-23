// app/api/admin/clubs/route.ts
// ADMIN API - Returns ALL clubs (active + inactive) for admin panel

import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

export async function GET() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    // Return ALL clubs (no filtering by active status)
    const clubs = await clubsCollection
      .find({}) // ← No filter - returns ALL clubs
      .sort({ name: 1 })
      .toArray();

    console.log(`📊 Admin API: Returning ${clubs.length} total clubs`);

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error("❌ Error fetching clubs:", error);
    return NextResponse.json(
      { error: "Failed to fetch clubs" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const client = new MongoClient(uri);

  try {
    const body = await request.json();

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    // Generate slug from club name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Add slug to club data
    const clubData = {
      ...body,
      slug,
    };

    const result = await clubsCollection.insertOne(clubData);

    console.log(`✅ Created club: ${body.name} (slug: ${slug})`);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      slug,
    });
  } catch (error) {
    console.error("❌ Error creating club:", error);
    return NextResponse.json(
      { error: "Failed to create club" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function PUT(request: Request) {
  const client = new MongoClient(uri);

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    // Regenerate slug if name is being updated
    if (updateData.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const result = await clubsCollection.updateOne(
      { id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    console.log(
      `✅ Updated club: ${updateData.name || id}${
        updateData.slug ? ` (slug: ${updateData.slug})` : ""
      }`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error updating club:", error);
    return NextResponse.json(
      { error: "Failed to update club" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function DELETE(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Club ID required" }, { status: 400 });
    }

    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    const result = await clubsCollection.deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    console.log(`✅ Deleted club: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting club:", error);
    return NextResponse.json(
      { error: "Failed to delete club" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
