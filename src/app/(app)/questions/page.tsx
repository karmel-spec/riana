import { requireSection, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { QuestionList } from "./question-list";
import { NewQuestionForm } from "./new-question-form";

export const metadata = { title: "Urgent Questions" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const v = await requireSection("urgent_questions");
  const { new: openNew } = await searchParams;
  const questions = await data.getQuestions(v);
  const parent = v.brief;
  const list = parent
    ? questions.filter((q) => q.asked_of === v.isSubject || q.asked_of === "both")
    : questions;
  const open = list.filter((q) => !["answered", "closed"].includes(q.status));
  const done = list.filter((q) => ["answered", "closed"].includes(q.status));

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : "Section 1"}
        title={parent ? "Questions from the family" : "Urgent questions to review"}
        intro={parent
          ? "Answer in your own words. There are no wrong answers, and you can change them later."
          : "Each question has an owner who will ask Mom and Dad, and a place to capture their answer."}
        actions={!parent && canWrite(v, "urgent_questions") ? <NewQuestionForm defaultOpen={openNew === "1"} /> : undefined}
      />
      <QuestionList title={parent ? `Waiting for you (${open.length})` : `Open (${open.length})`} questions={open} viewer={{ role: v.role, brief: v.brief, canEdit: canWrite(v, "urgent_questions"), name: v.name }} />
      {done.length > 0 && (
        <div className="mt-8">
          <QuestionList title={`Answered (${done.length})`} questions={done} viewer={{ role: v.role, brief: v.brief, canEdit: canWrite(v, "urgent_questions"), name: v.name }} collapsed />
        </div>
      )}
    </>
  );
}
