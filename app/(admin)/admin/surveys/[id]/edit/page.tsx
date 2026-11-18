"use client";

import { use } from "react";
import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SurveyBuilder from "@/components/surveys/SurveyBuilder";

export default function EditSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Surveys" title="Edit survey" subtitle={<Link href="/admin/surveys" className="underline">← All surveys</Link>} />
      <SurveyBuilder surveyId={id} />
    </div>
  );
}
