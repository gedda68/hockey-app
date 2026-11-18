"use client";

import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import SurveyBuilder from "@/components/surveys/SurveyBuilder";

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Surveys" title="New survey" subtitle={<Link href="/admin/surveys" className="underline">← All surveys</Link>} />
      <SurveyBuilder />
    </div>
  );
}
