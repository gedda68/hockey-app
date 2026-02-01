// app/api/admin/users/[userId]/route.ts
// User detail and update API

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { user: currentUser, response: authResponse } = await requirePermission(
    request,
    "system.users"
  );
  if (authResponse) return authResponse;

  try {
    const client = await clientPromise;
    const db = client.db();

    const user = await db
      .collection("users")
      .findOne({ userId })
      .then((u) => {
        if (!u) return null;
        const { passwordHash, ...userWithoutPassword } = u as any;
        return userWithoutPassword;
      });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (currentUser.role !== "super-admin") {
      // Association admin can only view users in their association
      if (currentUser.role === "association-admin") {
        if (user.associationId !== currentUser.associationId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      // Club admin can only view users in their club
      else if (currentUser.role === "club-admin") {
        if (user.clubId !== currentUser.clubId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH update user (including status changes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { user: currentUser, response: authResponse } = await requirePermission(
    request,
    "system.users"
  );
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    // Get existing user
    const existingUser = await db.collection("users").findOne({ userId });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (currentUser.role !== "super-admin") {
      if (currentUser.role === "association-admin") {
        if (existingUser.associationId !== currentUser.associationId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (currentUser.role === "club-admin") {
        if (existingUser.clubId !== currentUser.clubId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Prevent users from modifying their own status
    if (userId === currentUser.userId && body.status) {
      return NextResponse.json(
        { error: "You cannot change your own status" },
        { status: 400 }
      );
    }

    // Prepare update
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "role",
      "associationId",
      "clubId",
      "status",
      "assignedTeams",
      "linkedMembers",
    ];

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: currentUser.userId,
    };

    // Only update allowed fields
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Update user
    const result = await db
      .collection("users")
      .updateOne({ userId }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get updated user
    const updatedUser = await db
      .collection("users")
      .findOne({ userId })
      .then((u) => {
        if (!u) return null;
        const { passwordHash, ...userWithoutPassword } = u as any;
        return userWithoutPassword;
      });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT full update (for complete user edits)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { user: currentUser, response: authResponse } = await requirePermission(
    request,
    "system.users"
  );
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    // Get existing user
    const existingUser = await db.collection("users").findOne({ userId });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check access rights
    if (currentUser.role !== "super-admin") {
      if (currentUser.role === "association-admin") {
        if (existingUser.associationId !== currentUser.associationId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (currentUser.role === "club-admin") {
        if (existingUser.clubId !== currentUser.clubId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Validate email is unique (if changed)
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await db
        .collection("users")
        .findOne({ email: body.email.toLowerCase() });
      if (emailExists) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updateData = {
      ...body,
      userId, // Ensure userId doesn't change
      updatedAt: new Date(),
      updatedBy: currentUser.userId,
    };

    // Don't allow password change via this route
    delete updateData.passwordHash;
    delete updateData.password;

    await db.collection("users").updateOne({ userId }, { $set: updateData });

    // Get updated user
    const updatedUser = await db
      .collection("users")
      .findOne({ userId })
      .then((u) => {
        if (!u) return null;
        const { passwordHash, ...userWithoutPassword } = u as any;
        return userWithoutPassword;
      });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
