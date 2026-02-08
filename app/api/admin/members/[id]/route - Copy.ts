// app/api/admin/members/[id]/route.ts
// Members API - Get, Update, Delete individual member

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET - Get single member by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    console.log("🔍 GET member:", id);

    const client = await clientPromise;
    const db = client.db();

    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    console.log("✅ Found member:", member.personalInfo.displayName);

    return NextResponse.json({ member });
  } catch (error: any) {
    console.error("💥 Error fetching member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    console.log("✏️ Updating member:", id);

    const client = await clientPromise;
    const db = client.db();

    // Check if member exists
    const existingMember = await db
      .collection("members")
      .findOne({ memberId: id });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date().toISOString(),
      updatedBy: "system", // TODO: Get from auth context
    };

    // Update personal info
    if (body.personalInfo) {
      if (body.personalInfo.salutation !== undefined) {
        updateData["personalInfo.salutation"] = body.personalInfo.salutation;
      }
      if (body.personalInfo.firstName) {
        updateData["personalInfo.firstName"] =
          body.personalInfo.firstName.trim();
      }
      if (body.personalInfo.lastName) {
        updateData["personalInfo.lastName"] = body.personalInfo.lastName.trim();
      }
      if (body.personalInfo.displayName) {
        updateData["personalInfo.displayName"] =
          body.personalInfo.displayName.trim();
      }
      if (body.personalInfo.dateOfBirth) {
        updateData["personalInfo.dateOfBirth"] = body.personalInfo.dateOfBirth;
      }
      if (body.personalInfo.gender) {
        updateData["personalInfo.gender"] = body.personalInfo.gender;
      }
      if (body.personalInfo.photoUrl !== undefined) {
        updateData["personalInfo.photoUrl"] = body.personalInfo.photoUrl;
      }
    }

    // Update contact info
    if (body.contact) {
      if (body.contact.email) {
        updateData["contact.email"] = body.contact.email.trim().toLowerCase();
      }
      if (body.contact.phone !== undefined) {
        updateData["contact.phone"] = body.contact.phone;
      }
      if (body.contact.mobile !== undefined) {
        updateData["contact.mobile"] = body.contact.mobile;
      }
      if (body.contact.emergencyContact) {
        if (body.contact.emergencyContact.name) {
          updateData["contact.emergencyContact.name"] =
            body.contact.emergencyContact.name.trim();
        }
        if (body.contact.emergencyContact.relationship) {
          updateData["contact.emergencyContact.relationship"] =
            body.contact.emergencyContact.relationship;
        }
        if (body.contact.emergencyContact.phone) {
          updateData["contact.emergencyContact.phone"] =
            body.contact.emergencyContact.phone.trim();
        }
        if (body.contact.emergencyContact.email !== undefined) {
          updateData["contact.emergencyContact.email"] =
            body.contact.emergencyContact.email;
        }
      }
    }

    // Update address
    if (body.address) {
      if (body.address.street !== undefined) {
        updateData["address.street"] = body.address.street;
      }
      if (body.address.suburb !== undefined) {
        updateData["address.suburb"] = body.address.suburb;
      }
      if (body.address.state !== undefined) {
        updateData["address.state"] = body.address.state;
      }
      if (body.address.postcode !== undefined) {
        updateData["address.postcode"] = body.address.postcode;
      }
      if (body.address.country !== undefined) {
        updateData["address.country"] = body.address.country;
      }
    }

    // Update membership
    if (body.membership) {
      if (body.membership.joinDate) {
        updateData["membership.joinDate"] = body.membership.joinDate;
      }
      if (body.membership.membershipTypes) {
        updateData["membership.membershipTypes"] =
          body.membership.membershipTypes;
      }
      if (body.membership.status) {
        updateData["membership.status"] = body.membership.status;
      }
      if (body.membership.expiryDate !== undefined) {
        updateData["membership.expiryDate"] = body.membership.expiryDate;
      }
      if (body.membership.renewalDate !== undefined) {
        updateData["membership.renewalDate"] = body.membership.renewalDate;
      }
    }

    // Update roles
    if (body.roles !== undefined) {
      updateData.roles = body.roles;
    }

    // Update teams
    if (body.teams !== undefined) {
      updateData.teams = body.teams;
    }

    // Update medical
    if (body.medical !== undefined) {
      updateData.medical = body.medical;
    }

    // Update notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    // Update user ID link
    if (body.userId !== undefined) {
      updateData.userId = body.userId;
    }

    // Perform update
    await db
      .collection("members")
      .updateOne({ memberId: id }, { $set: updateData });

    // Get updated member
    const updatedMember = await db
      .collection("members")
      .findOne({ memberId: id });

    console.log("✅ Updated member:", id);

    return NextResponse.json({
      message: "Member updated successfully",
      member: updatedMember,
    });
  } catch (error: any) {
    console.error("💥 Error updating member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete/Deactivate member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    console.log("🗑️ Deactivating member:", id);

    const client = await clientPromise;
    const db = client.db();

    // Check if member exists
    const member = await db.collection("members").findOne({ memberId: id });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Soft delete - set status to Inactive
    await db.collection("members").updateOne(
      { memberId: id },
      {
        $set: {
          "membership.status": "Inactive",
          updatedAt: new Date().toISOString(),
          updatedBy: "system", // TODO: Get from auth context
        },
      },
    );

    console.log("✅ Deactivated member:", id);

    return NextResponse.json({
      message: "Member deactivated successfully",
    });
  } catch (error: any) {
    console.error("💥 Error deactivating member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
