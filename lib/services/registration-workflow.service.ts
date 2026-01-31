// lib/services/registration-workflow.service.ts
// Complete registration workflow service

import type {
  RegistrationPayload,
  RegistrationSummary,
  CompletedRegistration,
  ReturningPlayerInfo,
  RegistrationValidation,
  FeeLineItem,
} from "@/types/registration";
import type { Association } from "@/lib/db/schemas/association.schema";
import { Db } from "mongodb";

// ============================================================================
// REGISTRATION WORKFLOW SERVICE
// ============================================================================

export class RegistrationWorkflowService {
  constructor(private db: Db) {}

  /**
   * Step 1: Check if returning player and get suggested data
   */
  async checkReturningPlayer(
    email: string,
    clubId: string
  ): Promise<ReturningPlayerInfo> {
    // Find member by email
    const member = await this.db.collection("members").findOne({
      "contact.primaryEmail": email,
    });

    if (!member) {
      return {
        isReturningPlayer: false,
        previousRegistrations: [],
        suggestedData: {},
      };
    }

    // Get previous registrations
    const previousRegistrations = await this.db
      .collection("registrations")
      .find({ memberId: member.memberId })
      .sort({ seasonYear: -1 })
      .limit(3)
      .toArray();

    // Build suggested data from most recent info
    const suggestedData = {
      personalInfo: {
        firstName: member.personalInfo?.firstName,
        lastName: member.personalInfo?.lastName,
        dateOfBirth: member.personalInfo?.dateOfBirth,
        gender: member.personalInfo?.gender,
        email: member.contact?.primaryEmail,
        phone: member.contact?.primaryPhone,
      },
      address: member.address,
      emergencyContact: member.emergencyContact,
      medicalInfo: member.medicalInfo,
      preferences: {
        shirtSize: member.preferences?.shirtSize,
        photoConsent: member.preferences?.photoConsent,
      },
    };

    return {
      isReturningPlayer: true,
      previousRegistrations: previousRegistrations.map((reg: any) => ({
        seasonYear: reg.seasonYear,
        clubId: reg.clubId,
        clubName: reg.clubName,
        associationId: reg.associationId,
        roles: reg.roleIds,
      })),
      suggestedData,
    };
  }

  /**
   * Step 2: Calculate all fees based on selections
   */
  async calculateFees(
    clubId: string,
    roleIds: string[],
    ageCategory: string,
    seasonYear: string
  ): Promise<FeeLineItem[]> {
    const lineItems: FeeLineItem[] = [];

    // Get club and its associations
    const club = await this.db.collection("clubs").findOne({
      $or: [{ id: clubId }, { slug: clubId }],
    });

    if (!club) throw new Error("Club not found");

    // Get association hierarchy
    const associations = await this.getAssociationHierarchy(
      club.parentAssociationId
    );

    // Calculate association fees (for each level)
    for (const association of associations) {
      const associationFees = await this.getApplicableFees(
        association.associationId,
        "association",
        roleIds,
        ageCategory,
        seasonYear
      );

      lineItems.push(...associationFees);
    }

    // Calculate club fees
    const clubFees = await this.getApplicableFees(
      clubId,
      "club",
      roleIds,
      ageCategory,
      seasonYear
    );

    lineItems.push(...clubFees);

    // Add insurance if required
    // TODO: Get from association settings
    const requiresInsurance = true;
    if (requiresInsurance) {
      lineItems.push({
        itemId: `ins-${Date.now()}`,
        feeId: "insurance-standard",
        type: "insurance",
        name: "Personal Accident Insurance",
        amount: 25.0,
        gstIncluded: false,
      });
    }

    return lineItems;
  }

  /**
   * Step 3: Generate registration summary for review
   */
  async generateSummary(
    payload: RegistrationPayload
  ): Promise<RegistrationSummary> {
    // Get club
    const club = await this.db.collection("clubs").findOne({
      $or: [{ id: payload.clubId }, { slug: payload.clubId }],
    });

    if (!club) throw new Error("Club not found");

    // Get association hierarchy
    const associations = await this.getAssociationHierarchy(
      club.parentAssociationId
    );

    const primaryAssociation = associations[0]; // Direct parent
    const parentAssociations = associations.slice(1); // Grandparents

    // Calculate fees
    const lineItems = await this.calculateFees(
      payload.clubId,
      payload.roleIds,
      payload.ageCategory,
      payload.seasonYear
    );

    // Group fees by type
    const associationFees = lineItems.filter((f) => f.type === "association");
    const clubFees = lineItems.filter((f) => f.type === "club");
    const otherFees = lineItems.filter(
      (f) => f.type !== "association" && f.type !== "club"
    );

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const gst = lineItems.reduce((sum, item) => {
      if (item.gstIncluded) {
        return sum + item.amount - item.amount / 1.1;
      }
      return sum;
    }, 0);

    // Get roles
    const roles = await this.db
      .collection("club-roles")
      .find({ id: { $in: payload.roleIds } })
      .toArray();

    // Check if requires approval
    const requiresApproval =
      primaryAssociation.settings?.requiresApproval ?? false;
    const autoApproved =
      !requiresApproval ||
      (primaryAssociation.settings?.autoApproveReturningPlayers &&
        !payload.isNewMember);

    return {
      member: {
        memberId: payload.memberId,
        isNew: payload.isNewMember,
        firstName: payload.personalInfo?.firstName || "",
        lastName: payload.personalInfo?.lastName || "",
        email: payload.personalInfo?.email || "",
        dateOfBirth: payload.personalInfo?.dateOfBirth || "",
      },
      registrations: {
        association: {
          associationId: primaryAssociation.associationId,
          name: primaryAssociation.name,
          fees: associationFees.filter(
            (f) => f.associationId === primaryAssociation.associationId
          ),
        },
        parentAssociations: parentAssociations.map((assoc) => ({
          associationId: assoc.associationId,
          name: assoc.name,
          fees: associationFees.filter(
            (f) => f.associationId === assoc.associationId
          ),
        })),
        club: {
          clubId: club.id,
          name: club.name,
          fees: clubFees,
        },
      },
      roles: roles.map((r: any) => ({
        roleId: r.id,
        name: r.name,
        category: r.category,
      })),
      fees: {
        lineItems,
        subtotal,
        gst,
        total: subtotal,
      },
      requiresApproval,
      autoApproved,
      seasonYear: payload.seasonYear,
    };
  }

  /**
   * Step 4: Validate registration
   */
  async validateRegistration(
    payload: RegistrationPayload
  ): Promise<RegistrationValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if member exists (if not new)
    if (payload.memberId && !payload.isNewMember) {
      const member = await this.db
        .collection("members")
        .findOne({ memberId: payload.memberId });

      if (!member) {
        errors.push("Member not found");
      }

      // Check if banned
      if (member?.status?.banned) {
        const bannedUntil = new Date(member.status.bannedUntil);
        if (bannedUntil > new Date()) {
          return {
            isValid: false,
            errors: ["Member is currently banned"],
            warnings,
            eligibility: {
              canRegister: false,
              isBanned: true,
              banDetails: {
                reason: member.status.banReason,
                bannedUntil,
                bannedBy: member.status.bannedBy,
              },
              hasOutstandingFees: false,
            },
            feeValidation: {
              totalFees: 0,
              missingFees: [],
              invalidFees: [],
            },
          };
        }
      }

      // Check outstanding fees
      const outstandingFees = await this.db
        .collection("payments")
        .find({
          memberId: payload.memberId,
          status: "unpaid",
        })
        .toArray();

      const outstandingAmount = outstandingFees.reduce(
        (sum: number, p: any) => sum + p.amount,
        0
      );

      if (outstandingAmount > 0) {
        warnings.push(
          `Outstanding fees: $${outstandingAmount.toFixed(
            2
          )}. Please pay before registering.`
        );
      }
    }

    // Validate required fields for new members
    if (payload.isNewMember) {
      if (!payload.personalInfo) {
        errors.push("Personal information required for new members");
      }
      if (!payload.address) {
        errors.push("Address required for new members");
      }
      if (!payload.emergencyContact) {
        errors.push("Emergency contact required");
      }
    }

    // Validate fees
    const lineItems = await this.calculateFees(
      payload.clubId,
      payload.roleIds,
      payload.ageCategory,
      payload.seasonYear
    );

    const totalFees = lineItems.reduce((sum, item) => sum + item.amount, 0);

    // Validate agreements
    if (!payload.agreedToTerms) {
      errors.push("Must agree to terms and conditions");
    }
    if (!payload.agreedToCodeOfConduct) {
      errors.push("Must agree to code of conduct");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      eligibility: {
        canRegister: errors.length === 0,
        isBanned: false,
        hasOutstandingFees: false,
      },
      feeValidation: {
        totalFees,
        missingFees: [],
        invalidFees: [],
      },
    };
  }

  /**
   * Step 5: Complete registration (create all records)
   */
  async completeRegistration(
    payload: RegistrationPayload
  ): Promise<CompletedRegistration> {
    const session = this.db.client.startSession();

    try {
      let result: CompletedRegistration | null = null;

      await session.withTransaction(async () => {
        let memberId = payload.memberId;

        // Create member if new
        if (payload.isNewMember || !memberId) {
          memberId = await this.createMember(payload, session);
        }

        // Get associations hierarchy
        const club = await this.db.collection("clubs").findOne({
          $or: [{ id: payload.clubId }, { slug: payload.clubId }],
        });

        const associations = await this.getAssociationHierarchy(
          club!.parentAssociationId
        );

        // Create association registrations (for each level in hierarchy)
        const associationRegistrations =
          await this.createAssociationRegistrations(
            memberId!,
            associations,
            payload,
            session
          );

        // Create club registration
        const clubRegistration = await this.createClubRegistration(
          memberId!,
          payload,
          session
        );

        // Calculate and create payment record
        const lineItems = await this.calculateFees(
          payload.clubId,
          payload.roleIds,
          payload.ageCategory,
          payload.seasonYear
        );

        const totalAmount = lineItems.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        const payment = await this.createPaymentRecord(
          memberId!,
          lineItems,
          totalAmount,
          session
        );

        result = {
          registrationId: clubRegistration.registrationId,
          memberId: memberId!,
          associationRegistrations: associationRegistrations.map((reg) => ({
            registrationId: reg.registrationId,
            associationId: reg.associationId,
            associationName: reg.associationName,
            status: reg.status,
          })),
          clubRegistration: {
            registrationId: clubRegistration.registrationId,
            clubId: clubRegistration.clubId,
            clubName: clubRegistration.clubName,
            status: clubRegistration.status,
          },
          payment: {
            paymentId: payment.paymentId,
            amount: totalAmount,
            status: "pending",
          },
          nextSteps: [
            "Complete payment",
            "Update member profile if needed",
            "Join a team",
          ],
        };
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getAssociationHierarchy(
    associationId: string
  ): Promise<Association[]> {
    const hierarchy: Association[] = [];
    let currentId: string | undefined = associationId;

    while (currentId) {
      const association = await this.db
        .collection("associations")
        .findOne({ associationId: currentId });

      if (!association) break;

      hierarchy.push(association as any);
      currentId = association.parentAssociationId;
    }

    return hierarchy;
  }

  private async getApplicableFees(
    entityId: string,
    type: "association" | "club",
    roleIds: string[],
    ageCategory: string,
    seasonYear: string
  ): Promise<FeeLineItem[]> {
    const collection = type === "association" ? "associations" : "clubs";

    const entity = await this.db.collection(collection).findOne({
      [type === "association" ? "associationId" : "id"]: entityId,
    });

    if (!entity || !entity.fees) return [];

    const applicableFees = entity.fees.filter((fee: any) => {
      if (!fee.isActive) return false;

      // Check age category
      if (
        fee.appliesTo?.ageCategories &&
        !fee.appliesTo.ageCategories.includes(ageCategory)
      ) {
        return false;
      }

      // Check date validity
      if (fee.validFrom && new Date(fee.validFrom) > new Date()) return false;
      if (fee.validTo && new Date(fee.validTo) < new Date()) return false;

      return true;
    });

    return applicableFees.map((fee: any) => ({
      itemId: `${type}-${fee.feeId}-${Date.now()}`,
      feeId: fee.feeId,
      type,
      name: fee.name,
      description: fee.description,
      amount: fee.amount,
      gstIncluded: fee.gstIncluded,
      associationId: type === "association" ? entityId : undefined,
      clubId: type === "club" ? entityId : undefined,
    }));
  }

  private async createMember(
    payload: RegistrationPayload,
    session: any
  ): Promise<string> {
    const memberId = `M${Date.now().toString(36).toUpperCase()}`;

    await this.db.collection("members").insertOne(
      {
        memberId,
        personalInfo: payload.personalInfo,
        address: payload.address,
        contact: {
          primaryEmail: payload.personalInfo?.email,
          primaryPhone: payload.personalInfo?.phone,
        },
        emergencyContact: payload.emergencyContact,
        medicalInfo: payload.medicalInfo,
        membership: {
          status: "Active",
          joinedDate: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { session }
    );

    return memberId;
  }

  private async createAssociationRegistrations(
    memberId: string,
    associations: Association[],
    payload: RegistrationPayload,
    session: any
  ): Promise<any[]> {
    const registrations = [];

    for (const association of associations) {
      const registrationId = `AREG-${association.code}-${memberId}-${
        payload.seasonYear
      }-${Date.now().toString(36)}`;

      const registration = {
        registrationId,
        memberId,
        associationId: association.associationId,
        associationName: association.name,
        seasonYear: payload.seasonYear,
        status: association.settings?.requiresApproval ? "pending" : "active",
        roleIds: payload.roleIds,
        registeredDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db
        .collection("association-registrations")
        .insertOne(registration, { session });

      registrations.push(registration);
    }

    return registrations;
  }

  private async createClubRegistration(
    memberId: string,
    payload: RegistrationPayload,
    session: any
  ): Promise<any> {
    const club = await this.db.collection("clubs").findOne({
      $or: [{ id: payload.clubId }, { slug: payload.clubId }],
    });

    const registrationId = `CREG-${club!.id}-${memberId}-${
      payload.seasonYear
    }-${Date.now().toString(36)}`;

    const registration = {
      registrationId,
      memberId,
      clubId: club!.id,
      clubName: club!.name,
      registrationType: "primary",
      seasonYear: payload.seasonYear,
      status: "active",
      roleIds: payload.roleIds,
      registeredDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection("club-registrations")
      .insertOne(registration, { session });

    return registration;
  }

  private async createPaymentRecord(
    memberId: string,
    lineItems: FeeLineItem[],
    totalAmount: number,
    session: any
  ): Promise<any> {
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;

    const payment = {
      paymentId,
      memberId,
      amount: totalAmount,
      lineItems,
      status: "pending",
      createdAt: new Date(),
    };

    await this.db.collection("payments").insertOne(payment, { session });

    return payment;
  }
}
